import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/clerk-react";
import { Link } from "react-router-dom";

export default function Navbar() {
  const { isSignedIn } = useUser();
  return (
    <>
      {isSignedIn && (
        <nav className="bg-white-200 shadow-md p-4 flex flex-wrap">
      
          <ul className="flex space-x-6  flex-wrap ">
            <li className=" right-6 absolute ">
              <SignedOut>
                <SignInButton />
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </li>
            <li>
              <Link
                to="/"
                className="text-black hover:text-gray-600 font-semibold"
              >
                Home
              </Link>
            </li>
            <li>
            
            </li>
            <li>
              <Link
                to="/profile"
                className="text-black hover:text-gray-600 font-semibold"
              >
                Profile
              </Link>
            </li>
          </ul>
        </nav>
      )}
    
    </>
  );
}
