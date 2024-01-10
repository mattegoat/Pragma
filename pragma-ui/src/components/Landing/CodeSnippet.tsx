import React from "react";
import styles from "./styles.module.scss";
import GreenBox from "../common/GreenBox";
import { useState } from "react";
import { Tab } from "@headlessui/react";
import classNames from "classnames";
import CopyButtonComponent from "../common/CopyCode";

interface Category {
  title: string;
}

/**
 * Renders a code snippet component with tabs.
 * @return {JSX.Element} JSX for the code snippet component.
 */
export default function CodeSnippet() {
  const [categories] = useState<Category[]>([
    {
      title: "Price Feed",
    },
    {
      title: "Realized Vol",
    },
    {
      title: "VRF",
    },
  ]);

  return (
    <GreenBox className="relative w-full pb-40">
      <div className=" w-full">
        <Tab.Group>
          <Tab.List className="flex rounded-full bg-lightBlur md:space-x-1">
            {categories.map((category, index) => (
              <Tab
                key={index}
                className={({ selected }) =>
                  classNames(
                    "w-full rounded-full p-2 text-sm font-medium leading-5 sm:p-4 md:p-6",
                    "focus:outline-none",
                    selected
                      ? "bg-mint text-darkGreen"
                      : "text-lightGreen hover:text-white"
                  )
                }
              >
                {category.title}
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels className={"h-full "}>
            <Tab.Panel
              className={"h-full pt-6 font-mono leading-7 text-codeColor"}
              key={1}
            >
              <span className={classNames(styles.greenCode)}>function </span>
              <span className={classNames(styles.purpleCode)}>getThePrice</span>
              ()
              <span className={classNames(styles.greenCode)}>
                {" "}
                public view returns{" "}
              </span>
              (<span className={classNames(styles.purpleCode)}>int</span>){"{"}
              <br /> (<br />
              <span className={classNames(styles.greenCode)}>felt </span>
              test;
              <br />
              <span className={classNames(styles.greenCode)}>felt </span>
              IdkanyCairo; <br /> ) ={" "}
              <span className={classNames(styles.purpleCode)}>priceFeed</span>.
              <span className={classNames(styles.purpleCode)}>ImnotDev</span>();
              <br />
              <div className="absolute bottom-9">
                <CopyButtonComponent textToCopy={"test"} />
              </div>
            </Tab.Panel>
            <Tab.Panel className={"pt-6"} key={1}>
              {" "}
              <div className="absolute bottom-9">
                <CopyButtonComponent textToCopy={"test"} />
              </div>
            </Tab.Panel>
            <Tab.Panel className={"pt-6"} key={1}>
              {" "}
              <div className="absolute bottom-9">
                <CopyButtonComponent textToCopy={"test"} />
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </GreenBox>
  );
}