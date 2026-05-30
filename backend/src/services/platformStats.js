// @ts-check
const axios = require('axios');
const cheerio = require('cheerio');

// Simple in-memory cache: { key -> { data, expiresAt } }
const cache = new Map();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

function fromCache(key) {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  return null;
}
function toCache(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
}

/**
 * @param {string} username
 */
async function getLeetCodeStats(username) {
  const key = `lc:${username}`;
  const cached = fromCache(key);
  if (cached) return cached;

  const { data } = await axios.post(
    'https://leetcode.com/graphql',
    {
      query: `query userProfile($username: String!) {
        matchedUser(username: $username) {
          profile { ranking }
          submitStats {
            acSubmissionNum { difficulty count }
          }
        }
        userContestRanking(username: $username) {
          rating
          globalRanking
          attendedContestsCount
        }
      }`,
      variables: { username },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Referer: 'https://leetcode.com',
      },
      timeout: 8000,
    },
  );

  if (!data?.data?.matchedUser) throw new Error('LeetCode user not found');

  const user    = data.data.matchedUser;
  const contest = data.data.userContestRanking;

  const solved = user.submitStats?.acSubmissionNum?.find((s) => s.difficulty === 'All')?.count ?? 0;

  const result = {
    rating:            contest?.rating        ? Math.round(contest.rating) : null,
    globalRanking:     contest?.globalRanking ?? null,
    profileRanking:    user.profile?.ranking  ?? null,
    problemsSolved:    solved,
    contestsAttended:  contest?.attendedContestsCount ?? 0,
  };

  toCache(key, result);
  return result;
}

/**
 * @param {string} username
 */
async function getCodeChefStats(username) {
  const key = `cc:${username}`;
  const cached = fromCache(key);
  if (cached) return cached;

  const { data: html } = await axios.get(
    `https://www.codechef.com/users/${username}`,
    {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    },
  );

  const $ = cheerio.load(html);

  // Current rating number
  const ratingText = $('.rating-number').first().text().trim();
  const rating = ratingText ? parseInt(ratingText, 10) : null;

  // Stars (count filled star characters)
  const starsText = $('.rating-star').first().text().trim();
  const stars = starsText || ($('.user-details-container .rating').first().text().trim() || null);

  // Highest rating from the aside section
  const highestRatingText = $('.rating-header .rating-number').last().text().trim();
  const highestRating = highestRatingText && highestRatingText !== ratingText
    ? parseInt(highestRatingText, 10)
    : null;

  // Global and country rank
  let globalRank = null;
  let countryRank = null;
  $('.rating-ranks ul li').each((_, el) => {
    const label = $(el).find('strong').text().trim().toLowerCase();
    const val = parseInt($(el).find('a, span').last().text().trim().replace(/,/g, ''), 10);
    if (label.includes('global')) globalRank = val || null;
    if (label.includes('country')) countryRank = val || null;
  });

  if (!rating && !stars) throw new Error('CodeChef user not found or profile is private');

  const result = { rating, highestRating, stars, globalRank, countryRank };
  toCache(key, result);
  return result;
}

module.exports = { getLeetCodeStats, getCodeChefStats };
