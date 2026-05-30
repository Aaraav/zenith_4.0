// @ts-check

/** @typedef {{ name: string, type: string }} Parameter */
/** @typedef {{ name: string, returnType: string, parameters: Parameter[] }} EntryPoint */

const SUPPORTED_PARAM_TYPES = new Set([
  'string', 'number', 'boolean',
  'string[]', 'number[]', 'string[][]', 'number[][]',
]);

const SUPPORTED_RETURN_TYPES = new Set([
  'string', 'number', 'boolean',
  'string[]', 'number[]', 'string[][]', 'number[][]',
]);

/**
 * @param {EntryPoint | null | undefined} entryPoint
 */
function validateEntryPoint(entryPoint) {
  if (!entryPoint?.name || !Array.isArray(entryPoint.parameters)) {
    throw new Error('Invalid entryPoint: name and parameters are required');
  }
  if (!SUPPORTED_RETURN_TYPES.has(entryPoint.returnType)) {
    throw new Error(`Unsupported return type: ${entryPoint.returnType}`);
  }
  for (const p of entryPoint.parameters) {
    if (!p.name || !SUPPORTED_PARAM_TYPES.has(p.type)) {
      throw new Error(`Unsupported parameter type: ${p.type}`);
    }
  }
}

/**
 * @param {string} returnType
 */
function isArrayReturn(returnType) {
  return returnType.endsWith('[]');
}

/**
 * @param {string} language
 * @param {string} userCode
 * @param {EntryPoint} entryPoint
 */
function buildLeetCodeDriver(language, userCode, entryPoint) {
  validateEntryPoint(entryPoint);
  const trimmed = userCode.trim();
  if (!trimmed) return userCode;

  switch (language) {
    case 'javascript':
      return buildJsDriver(trimmed, entryPoint);
    case 'python':
      return buildPythonDriver(trimmed, entryPoint);
    case 'cpp':
      return buildCppDriver(trimmed, entryPoint);
    case 'java':
      return buildJavaDriver(trimmed, entryPoint);
    default:
      throw new Error(`LeetCode driver not supported for language: ${language}`);
  }
}

/**
 * @param {EntryPoint} entryPoint
 */
function formatSignature(entryPoint) {
  const params = entryPoint.parameters
    .map((p) => `${p.type} ${p.name}`)
    .join(', ');
  return `${entryPoint.returnType} ${entryPoint.name}(${params})`;
}

/**
 * @param {string} userCode
 * @param {EntryPoint} ep
 */
function buildJsDriver(userCode, ep) {
  const args = ep.parameters.length ? '...__args' : '';
  const print = isArrayReturn(ep.returnType) || ep.returnType === 'number' || ep.returnType === 'boolean'
    ? `console.log(typeof __result === "string" ? __result : JSON.stringify(__result));`
    : `console.log(__result);`;

  return `${userCode}

import * as fs from "node:fs";
const __args = JSON.parse(fs.readFileSync(0, "utf8").trim());
const __result = ${ep.name}(${args});
${print}`;
}

/**
 * @param {string} userCode
 * @param {EntryPoint} ep
 */
function buildPythonDriver(userCode, ep) {
  const args = ep.parameters.length ? '*__args' : '';
  let print;
  if (isArrayReturn(ep.returnType)) {
    print = 'print(json.dumps(__result, separators=(",", ":")), end="")';
  } else if (ep.returnType === 'boolean') {
    print = 'print(str(__result).lower(), end="")';
  } else {
    print = 'print(__result, end="")';
  }

  return `import json
import sys
${userCode}

__args = json.loads(sys.stdin.read())
__result = ${ep.name}(${args})
${print}`;
}

const CPP_JSON_HELPERS = `
#include <iostream>
#include <vector>
#include <string>
#include <cctype>

using namespace std;

size_t __skipSpace(const string& s, size_t i) {
  while (i < s.size() && (s[i] == ' ' || s[i] == '\\n' || s[i] == '\\r' || s[i] == '\\t')) i++;
  return i;
}

string __parseJsonString(const string& s, size_t& i) {
  i = __skipSpace(s, i);
  string out;
  if (i >= s.size() || s[i] != '"') return out;
  i++;
  while (i < s.size() && s[i] != '"') {
    if (s[i] == '\\\\' && i + 1 < s.size()) { out += s[i + 1]; i += 2; }
    else { out += s[i++]; }
  }
  if (i < s.size() && s[i] == '"') i++;
  return out;
}

int __parseJsonNumber(const string& s, size_t& i) {
  i = __skipSpace(s, i);
  size_t start = i;
  if (i < s.size() && s[i] == '-') i++;
  while (i < s.size() && (isdigit(s[i]) || s[i] == '.')) i++;
  string num = s.substr(start, i - start);
  if (num.find('.') != string::npos) return (int)stod(num);
  return (int)stoll(num);
}

bool __parseJsonBool(const string& s, size_t& i) {
  i = __skipSpace(s, i);
  if (s.substr(i, 4) == "true") { i += 4; return true; }
  if (s.substr(i, 5) == "false") { i += 5; return false; }
  return false;
}

vector<string> __parseJsonStringArray(const string& s, size_t& i) {
  vector<string> res;
  i = __skipSpace(s, i);
  if (i >= s.size() || s[i] != '[') return res;
  i++;
  i = __skipSpace(s, i);
  if (i < s.size() && s[i] == ']') { i++; return res; }
  while (i < s.size()) {
    res.push_back(__parseJsonString(s, i));
    i = __skipSpace(s, i);
    if (i < s.size() && s[i] == ',') { i++; continue; }
    if (i < s.size() && s[i] == ']') { i++; break; }
    break;
  }
  return res;
}

vector<int> __parseJsonNumberArray(const string& s, size_t& i) {
  vector<int> res;
  i = __skipSpace(s, i);
  if (i >= s.size() || s[i] != '[') return res;
  i++;
  i = __skipSpace(s, i);
  if (i < s.size() && s[i] == ']') { i++; return res; }
  while (i < s.size()) {
    res.push_back(__parseJsonNumber(s, i));
    i = __skipSpace(s, i);
    if (i < s.size() && s[i] == ',') { i++; continue; }
    if (i < s.size() && s[i] == ']') { i++; break; }
    break;
  }
  return res;
}

vector<vector<string>> __parseJsonStringArray2D(const string& s, size_t& i) {
  vector<vector<string>> res;
  i = __skipSpace(s, i);
  if (i >= s.size() || s[i] != '[') return res;
  i++;
  i = __skipSpace(s, i);
  if (i < s.size() && s[i] == ']') { i++; return res; }
  while (i < s.size()) {
    res.push_back(__parseJsonStringArray(s, i));
    i = __skipSpace(s, i);
    if (i < s.size() && s[i] == ',') { i++; continue; }
    if (i < s.size() && s[i] == ']') { i++; break; }
    break;
  }
  return res;
}

vector<vector<int>> __parseJsonNumberArray2D(const string& s, size_t& i) {
  vector<vector<int>> res;
  i = __skipSpace(s, i);
  if (i >= s.size() || s[i] != '[') return res;
  i++;
  i = __skipSpace(s, i);
  if (i < s.size() && s[i] == ']') { i++; return res; }
  while (i < s.size()) {
    res.push_back(__parseJsonNumberArray(s, i));
    i = __skipSpace(s, i);
    if (i < s.size() && s[i] == ',') { i++; continue; }
    if (i < s.size() && s[i] == ']') { i++; break; }
    break;
  }
  return res;
}

string __readStdin() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  string input, line;
  while (getline(cin, line)) {
    if (!input.empty()) input += "\\n";
    input += line;
  }
  return input;
}
`;

/**
 * @param {string} type
 * @param {string} varName
 * @param {number} idx
 */
function cppParseParam(type, varName, idx) {
  const parsers = {
    string: '__parseJsonString',
    number: '__parseJsonNumber',
    boolean: '__parseJsonBool',
    'string[]': '__parseJsonStringArray',
    'number[]': '__parseJsonNumberArray',
    'string[][]': '__parseJsonStringArray2D',
    'number[][]': '__parseJsonNumberArray2D',
  };
  const cppTypes = {
    string: 'string',
    number: 'int',
    boolean: 'bool',
    'string[]': 'vector<string>',
    'number[]': 'vector<int>',
    'string[][]': 'vector<vector<string>>',
    'number[][]': 'vector<vector<int>>',
  };
  const parser = parsers[type];
  const cppType = cppTypes[type];
  const comma = idx > 0
    ? `  __pos = __skipSpace(__stdin, __pos);
  if (__pos < __stdin.size() && __stdin[__pos] == ',') __pos++;
`
    : '';
  return `${comma}  ${cppType} ${varName} = ${parser}(__stdin, __pos);`;
}

/**
 * @param {string} userCode
 * @param {EntryPoint} ep
 */
function buildCppDriver(userCode, ep) {
  const headers = userCode.includes('#include') ? '' : '#include <iostream>\n#include <vector>\n#include <string>\n#include <cctype>\nusing namespace std;\n\n';
  const paramDecls = ep.parameters.map((p, i) => cppParseParam(p.type, `__arg${i}`, i)).join('\n');
  const argList = ep.parameters.map((_, i) => `__arg${i}`).join(', ');
  const callType = {
    string: 'string',
    number: 'int',
    boolean: 'bool',
    'string[]': 'vector<string>',
    'number[]': 'vector<int>',
    'string[][]': 'vector<vector<string>>',
    'number[][]': 'vector<vector<int>>',
  }[ep.returnType];

  let printBlock;
  if (ep.returnType === 'string[]') {
    printBlock = `  cout << "[";
  for (size_t __i = 0; __i < __result.size(); __i++) {
    if (__i) cout << ",";
    cout << "\\"" << __result[__i] << "\\"";
  }
  cout << "]";`;
  } else if (ep.returnType === 'number[]') {
    printBlock = `  cout << "[";
  for (size_t __i = 0; __i < __result.size(); __i++) {
    if (__i) cout << ",";
    cout << __result[__i];
  }
  cout << "]";`;
  } else if (ep.returnType === 'string') {
    printBlock = '  cout << __result;';
  } else if (ep.returnType === 'number') {
    printBlock = '  cout << __result;';
  } else if (ep.returnType === 'boolean') {
    printBlock = '  cout << (__result ? "true" : "false");';
  } else {
    printBlock = '  cout << __result;';
  }

  return `${headers}${CPP_JSON_HELPERS}

${userCode}

int main() {
  string __stdin = __readStdin();
  size_t __pos = __skipSpace(__stdin, 0);
  if (__pos < __stdin.size() && __stdin[__pos] == '[') __pos++;
${paramDecls}
  ${callType} __result = ${ep.name}(${argList});
${printBlock}
  return 0;
}
`;
}

const JAVA_JSON_HELPERS = `
  static String readStdin() throws Exception {
    return new String(System.in.readAllBytes()).trim();
  }

  static int skipSpace(String s, int i) {
    while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++;
    return i;
  }

  static String parseJsonString(String s, int[] idx) {
    idx[0] = skipSpace(s, idx[0]);
    StringBuilder out = new StringBuilder();
    if (idx[0] >= s.length() || s.charAt(idx[0]) != '"') return "";
    idx[0]++;
    while (idx[0] < s.length() && s.charAt(idx[0]) != '"') {
      if (s.charAt(idx[0]) == '\\\\' && idx[0] + 1 < s.length()) {
        out.append(s.charAt(idx[0] + 1));
        idx[0] += 2;
      } else {
        out.append(s.charAt(idx[0]++));
      }
    }
    if (idx[0] < s.length() && s.charAt(idx[0]) == '"') idx[0]++;
    return out.toString();
  }

  static int parseJsonNumber(String s, int[] idx) {
    idx[0] = skipSpace(s, idx[0]);
    int start = idx[0];
    if (idx[0] < s.length() && s.charAt(idx[0]) == '-') idx[0]++;
    while (idx[0] < s.length() && (Character.isDigit(s.charAt(idx[0])) || s.charAt(idx[0]) == '.')) idx[0]++;
    return (int) Double.parseDouble(s.substring(start, idx[0]));
  }

  static boolean parseJsonBool(String s, int[] idx) {
    idx[0] = skipSpace(s, idx[0]);
    if (s.startsWith("true", idx[0])) { idx[0] += 4; return true; }
    if (s.startsWith("false", idx[0])) { idx[0] += 5; return false; }
    return false;
  }

  static String[] parseJsonStringArray(String s, int[] idx) {
    idx[0] = skipSpace(s, idx[0]);
    if (idx[0] >= s.length() || s.charAt(idx[0]) != '[') return new String[0];
    idx[0]++;
    idx[0] = skipSpace(s, idx[0]);
    if (idx[0] < s.length() && s.charAt(idx[0]) == ']') { idx[0]++; return new String[0]; }
    java.util.List<String> list = new java.util.ArrayList<>();
    while (idx[0] < s.length()) {
      list.add(parseJsonString(s, idx));
      idx[0] = skipSpace(s, idx[0]);
      if (idx[0] < s.length() && s.charAt(idx[0]) == ',') { idx[0]++; continue; }
      if (idx[0] < s.length() && s.charAt(idx[0]) == ']') { idx[0]++; break; }
      break;
    }
    return list.toArray(new String[0]);
  }

  static int[] parseJsonNumberArray(String s, int[] idx) {
    idx[0] = skipSpace(s, idx[0]);
    if (idx[0] >= s.length() || s.charAt(idx[0]) != '[') return new int[0];
    idx[0]++;
    idx[0] = skipSpace(s, idx[0]);
    if (idx[0] < s.length() && s.charAt(idx[0]) == ']') { idx[0]++; return new int[0]; }
    java.util.List<Integer> list = new java.util.ArrayList<>();
    while (idx[0] < s.length()) {
      list.add(parseJsonNumber(s, idx));
      idx[0] = skipSpace(s, idx[0]);
      if (idx[0] < s.length() && s.charAt(idx[0]) == ',') { idx[0]++; continue; }
      if (idx[0] < s.length() && s.charAt(idx[0]) == ']') { idx[0]++; break; }
      break;
    }
    int[] arr = new int[list.size()];
    for (int i = 0; i < list.size(); i++) arr[i] = list.get(i);
    return arr;
  }
`;

/**
 * @param {string} type
 * @param {string} varName
 * @param {number} idx
 */
function javaParseParam(type, varName, idx) {
  const parsers = {
    string: 'parseJsonString',
    number: 'parseJsonNumber',
    boolean: 'parseJsonBool',
    'string[]': 'parseJsonStringArray',
    'number[]': 'parseJsonNumberArray',
  };
  const javaTypes = {
    string: 'String',
    number: 'int',
    boolean: 'boolean',
    'string[]': 'String[]',
    'number[]': 'int[]',
  };
  if (!parsers[type]) throw new Error(`Java driver does not support param type: ${type}`);
  const comma = idx > 0
    ? `    __pos[0] = skipSpace(__stdin, __pos[0]);
    if (__pos[0] < __stdin.length() && __stdin.charAt(__pos[0]) == ',') __pos[0]++;
`
    : '';
  return `${comma}    ${javaTypes[type]} ${varName} = ${parsers[type]}(__stdin, __pos);`;
}

/**
 * @param {string} userCode
 * @param {EntryPoint} ep
 */
function buildJavaDriver(userCode, ep) {
  const paramDecls = ep.parameters.map((p, i) => javaParseParam(p.type, `__arg${i}`, i)).join('\n');
  const argList = ep.parameters.map((_, i) => `__arg${i}`).join(', ');

  let printBlock;
  if (ep.returnType === 'string') {
    printBlock = '    System.out.print(__result);';
  } else if (ep.returnType === 'number') {
    printBlock = '    System.out.print(__result);';
  } else if (ep.returnType === 'boolean') {
    printBlock = '    System.out.print(__result ? "true" : "false");';
  } else if (ep.returnType === 'string[]') {
    printBlock = `    System.out.print("[");
    for (int __i = 0; __i < __result.length; __i++) {
      if (__i > 0) System.out.print(",");
      System.out.print("\\"" + __result[__i] + "\\"");
    }
    System.out.print("]");`;
  } else if (ep.returnType === 'number[]') {
    printBlock = `    System.out.print("[");
    for (int __i = 0; __i < __result.length; __i++) {
      if (__i > 0) System.out.print(",");
      System.out.print(__result[__i]);
    }
    System.out.print("]");`;
  } else {
    printBlock = '    System.out.print(__result);';
  }

  const returnJavaType = {
    string: 'String',
    number: 'int',
    boolean: 'boolean',
    'string[]': 'String[]',
    'number[]': 'int[]',
  }[ep.returnType] || 'String';

  const wrappedUser = /public\s+class\s+Main/.test(userCode)
    ? userCode.replace(/public\s+static\s+void\s+main\s*\([^)]*\)\s*\{[\s\S]*\}\s*$/, '')
    : userCode;

  return `import java.util.*;

public class Main {
${JAVA_JSON_HELPERS}

${wrappedUser.trim()}

  public static void main(String[] args) throws Exception {
    String __stdin = readStdin();
    int[] __pos = { skipSpace(__stdin, 0) };
    if (__pos[0] < __stdin.length() && __stdin.charAt(__pos[0]) == '[') __pos[0]++;
${paramDecls}
    ${returnJavaType} __result = ${ep.name}(${argList});
${printBlock}
  }
}
`;
}

module.exports = {
  buildLeetCodeDriver,
  validateEntryPoint,
  formatSignature,
  SUPPORTED_PARAM_TYPES,
  SUPPORTED_RETURN_TYPES,
};
