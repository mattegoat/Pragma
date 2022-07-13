import React from "react";
import { Logo } from "./LogoCloud";

const workLogos: Logo[] = [
  {
    name: "Harvard University",
    src: "/assets/team/harvard.svg",
  },
  {
    name: "TU Munich",
    src: "/assets/team/tum.svg",
  },
  {
    name: "Massachusetts Institute of Technology",
    src: "/assets/team/mit.svg",
  },
];

const TeamSection = () => (
  <div className="w-full max-w-7xl">
    <div className="grid grid-cols-2 gap-1 md:grid-cols-3">
      {workLogos.map(({ name, src }) => (
        <div
          key={name}
          className="col-span-1 flex justify-center bg-gray-200 py-8 px-8"
        >
          <img
            className="h-12 w-auto grayscale hover:grayscale-0"
            src={src}
            alt={name}
          />
        </div>
      ))}
    </div>
  </div>
);
export default TeamSection;
