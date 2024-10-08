import React, { Fragment, useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Listbox, Transition } from "@headlessui/react";
import { options } from "../../pages/assets";
import { UTCTimestamp, createChart } from "lightweight-charts";
import { useData } from "../../providers/data";
import { Asset } from "../../pages/asset/[ticker]";
import moment from "moment";
import { removeDuplicateTimestamps, timezone } from "../../pages";

const AssetChart = ({ asset }: { asset: Asset }) => {
  const { currentSource, switchSource } = useData();
  const [selectedFrame] = useState("15min");
  const [, setAssetPair] = useState(undefined);
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (asset === undefined || !chartContainerRef.current) return;

    console.log(selectedFrame, asset.ticker);

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400, // Adjust this value as needed
      layout: {
        background: { color: "#00000000" },
        textColor: "white",
      },
      grid: {
        vertLines: { color: "rgba(197, 203, 206, 0.1)" },
        horzLines: { color: "rgba(197, 203, 206, 0.1)" },
      },
      timeScale: {
        rightOffset: 12,
        barSpacing: 3,
        fixLeftEdge: true,
        lockVisibleTimeRangeOnResize: true,
        rightBarStaysOnScroll: true,
        borderVisible: false,
        borderColor: "#fff000",
        visible: true,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chart.applyOptions({
      handleScroll: false,
      handleScale: false,
    });

    const lineSeries = chart.addLineSeries({ color: "rgba(4, 255, 181, 1)" });
    chartRef.current = { chart, lineSeries };

    return () => {
      chart.remove();
    };
  }, [asset, selectedFrame]);

  useEffect(() => {
    if (asset === undefined) return;

    const wsInstance = new WebSocket(
      "wss://ws.dev.pragma.build/node/v1/onchain/ohlc/subscribe"
    );

    const subscribe = () => {
      wsInstance.send(
        JSON.stringify({
          msg_type: "subscribe",
          pair: asset.ticker,
          network: currentSource,
          interval: selectedFrame,
          candles_to_get: 1000,
        })
      );
    };

    wsInstance.onopen = () => {
      console.log("WebSocket connected");
      subscribe();
    };

    wsInstance.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.msg_type === "subscribe") return;

      setAssetPair((prevAssetPair) => {
        let updatedPriceData = prevAssetPair?.priceData || [];
        let lastPrice;

        if (Array.isArray(data) && data.length === 1) {
          // Individual update
          const newData = data[0];
          lastPrice = parseInt(newData.open) / 10 ** 8;
          const time = (moment.tz(newData.time, timezone).valueOf() /
            1000) as UTCTimestamp;

          if (
            updatedPriceData.length > 0 &&
            updatedPriceData[updatedPriceData.length - 1].time === time
          ) {
            // Update last price if time is the same
            updatedPriceData = [
              ...updatedPriceData.slice(0, -1),
              { time, value: lastPrice },
            ];
          } else {
            // Add new data point
            updatedPriceData = [
              ...updatedPriceData,
              { time, value: lastPrice },
            ];
          }
        } else if (Array.isArray(data) && data.length > 1) {
          // Bulk update
          const unduplicatedData = removeDuplicateTimestamps(
            data.sort(
              (a, b) =>
                moment.tz(b.time, timezone).valueOf() -
                moment.tz(a.time, timezone).valueOf()
            )
          );

          updatedPriceData = unduplicatedData.reverse().map((d: any) => ({
            time: (moment.tz(d.time, timezone).valueOf() /
              1000) as UTCTimestamp,
            value: parseInt(d.open) / 10 ** 8,
          }));

          lastPrice = parseFloat(data[data.length - 1].close);
        } else {
          console.error("Unexpected data format:", data);
          return prevAssetPair;
        }

        // Ensure the data is sorted
        updatedPriceData.sort((a, b) => a.time - b.time);

        // Update the chart
        if (chartRef.current) {
          chartRef.current.lineSeries.setData(updatedPriceData);
        }

        return {
          ticker: asset.ticker,
          lastPrice,
          variation24h: 0,
          relativeVariation24h: 0,
          priceData: updatedPriceData,
        };
      });
    };

    wsInstance.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    if (wsInstance.readyState === WebSocket.OPEN) {
      subscribe();
    }

    return () => {
      console.log("Closing WebSocket");
      wsInstance.close();
    };
  }, [asset, selectedFrame, currentSource]);

  return (
    <div className="w-full flex-col justify-between gap-8 md:flex-row md:gap-5">
      <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:gap-10">
        <Listbox value={currentSource} onChange={switchSource}>
          <div className="relative md:w-auto">
            <Listbox.Button className="relative flex w-full cursor-pointer flex-row justify-center rounded-full border border-lightBlur py-3 px-6 text-center text-sm text-lightGreen focus:outline-none sm:w-fit">
              <span className="block truncate">{currentSource}</span>
              <Image
                className="my-auto pl-2"
                height={16}
                width={16}
                alt="arrowDown"
                src="/assets/vectors/arrowDown.svg"
              />
            </Listbox.Button>
            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-10 mt-1 max-h-60 overflow-auto rounded-md bg-green py-1 text-sm text-lightGreen ring-1 backdrop-blur focus:outline-none">
                {options.map((option, optionIdx) => (
                  <Listbox.Option
                    key={optionIdx}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-2 pl-10 pr-4 text-lightGreen ${
                        active ? "opacity-50 " : ""
                      }`
                    }
                    value={option}
                  >
                    {({ selected }) => (
                      <>
                        <span
                          className={`block truncate text-lightGreen ${
                            selected ? "font-medium" : "font-normal"
                          }`}
                        >
                          {option}
                        </span>
                        {selected ? (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3"></span>
                        ) : null}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>
      </div>
      <div ref={chartContainerRef} className="h-[400px] w-full" />
    </div>
  );
};

export default AssetChart;
