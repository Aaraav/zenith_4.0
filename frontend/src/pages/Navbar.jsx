import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  UserButton,
  useClerk,
  useUser,
} from "@clerk/clerk-react";
import {
  Navbar as ResizableNavbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "../components/ui/resizable-navbar.js";

const SIGN_IN_BTN =
  "relative z-20 cursor-pointer px-5 py-2 text-sm font-semibold text-white rounded-full " +
  "bg-gradient-to-r from-purple-600 to-blue-600 " +
  "hover:from-purple-500 hover:to-blue-500 " +
  "transition-all duration-300 border border-white/20 " +
  "shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 " +
  "hover:scale-[1.02] active:scale-[0.98]";

function SignInBtn({ className = "" }) {
  const { openSignIn } = useClerk();
  return (
    <button
      type="button"
      className={`${SIGN_IN_BTN} ${className}`}
      onClick={() => openSignIn()}
    >
      Sign In
    </button>
  );
}

export default function Navbar() {
  const { isLoaded } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "Home", link: "/" },
    { name: "Profile", link: "/profile" },
    { name: "Battle History", link: "/battle-history" },
  ];

  return (
    <div className="relative w-full">
      <ResizableNavbar>
        <NavBody>
          <NavbarLogo />
          <NavItems items={navItems} />
          <div className="relative z-20 flex shrink-0 items-center gap-4">
            {isLoaded && (
              <>
                <SignedIn>
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: "w-9 h-9 ring-2 ring-purple-500/40 ring-offset-2 ring-offset-neutral-950",
                      },
                    }}
                  />
                </SignedIn>
                <SignedOut>
                  <SignInBtn />
                </SignedOut>
              </>
            )}
          </div>
        </NavBody>

        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo />
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            {navItems.map((item, idx) => (
              <Link
                key={`mobile-link-${idx}`}
                to={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className="relative text-neutral-300 hover:text-white transition-colors"
              >
                <span className="block">{item.name}</span>
              </Link>
            ))}
            <div className="flex w-full flex-col gap-4 mt-4">
              <SignedIn>
                <UserButton />
              </SignedIn>
              <SignedOut>
                <SignInBtn className="w-full" />
              </SignedOut>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </ResizableNavbar>
    </div>
  );
}
