import React from "react";
import { useRouter } from "next/router";
import { AppProps } from "next/app";
import { DefaultSeo } from "next-seo";

import "../styles/index.css";
import NavFooter from "../components/Navigation/NavFooter";
import { StarknetConfig, voyager, jsonRpcProvider } from "@starknet-react/core";
import Head from "next/head";
import NavHeader from "../components/Navigation/NavHeader";
import { sepolia, Chain } from "@starknet-react/chains";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

const MyApp = ({ Component, pageProps }: AppProps) => {
  /**
   * Generates RPC configuration for the specified chain.
   * @param {Chain} chain - The blockchain chain for which to generate RPC configuration.
   * @return {object} An object containing RPC configuration for the specified chain.
   */
  function rpc(chain: Chain) {
    return {
      nodeUrl: `https://starknet-sepolia.public.blastapi.io/rpc/v0_6`,
    };
  }

  const provider = jsonRpcProvider({ rpc });

  // Needed because of the following bug: https://github.com/vercel/next.js/issues/9992
  const router = useRouter();

  return (
    <>
      <Head>
        <meta charSet="UTF-8" key="charset" />
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1"
          key="viewport"
        />
        <link rel="icon" type="image/ico" href="/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#B5F0E5" />
      </Head>
      <Analytics />
      <SpeedInsights />
      <DefaultSeo
        titleTemplate="%s - Pragma - The network of zk-truth machines"
        defaultTitle="Pragma - The network of zk-truth machines"
        description="Pragma is the first network of zk-truth machines. Pragma provides data feeds for decentralized applications. Oracles are dead, long live truth machines."
        canonical="https://www.pragma.build"
        openGraph={{
          url: "https://www.pragma.build",
          title: "Pragma - The network of zk-truth machines",
          description:
            "Pragma is the first network of zk-truth machines. Pragma provides data feeds for decentralized applications. Oracles are dead, long live truth machines.",
          images: [
            {
              url: "https://www.pragma.build/pragma-og-img.png",
              width: 1200,
              height: 630,
              alt: "Pragma",
              type: "image/png",
            },
          ],
          site_name: "Pragma",
        }}
        twitter={{
          site: "@pragmaoracle",
          cardType: "summary_large_image",
        }}
      />
      <StarknetConfig chains={[sepolia]} provider={provider} explorer={voyager}>
        <div className="text-sans flex min-h-screen flex-col items-center justify-start bg-darkGreen">
          <NavHeader />
          <Component {...pageProps} key={router.asPath} />
          <NavFooter />
        </div>
      </StarknetConfig>
    </>
  );
};

export default MyApp;
