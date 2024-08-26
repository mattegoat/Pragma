import React, { useState, useEffect } from "react";
import { XIcon } from "@heroicons/react/solid";
import Image from "next/image";
import { ClockIcon, InformationCircleIcon } from "@heroicons/react/outline";
import { Item } from "../../pages/optimistic";
import axios from 'axios';
import { useAccount, useContractWrite, useContractRead,useWaitForTransaction } from "@starknet-react/core";
import { OO_CONTRACT_ADDRESS, CURRENCIES,ORACLE_ANCILLARY_ADDRESS } from '../../pages/constants';
import { uint256 } from "starknet";
import WalletConnection from "../common/WalletConnection";


interface AssessmentPopupProps {
  assessment: Item; // Replace 'any' with your actual Assessment type
  onClose: () => void;
  network: string
}

interface ResolutionDetails {
  domain_id: string;
  asserter: string;
  disputer: string | null;  // 'None' can be treated as null.
  disputed: boolean;
  dispute_id: string | null;  // 'None' can be treated as null.
  callback_recipient: string;
  caller: string;
  settled: boolean;
  settle_caller: string;
  settlement_resolution: string;  
}

const AssessmentPopup: React.FC<AssessmentPopupProps> = ({
  assessment,
  onClose,
  network
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState("");
  const currency = CURRENCIES[network];
  const { address } = useAccount();
  const [resolutionItem, setResolutionItem] = useState<ResolutionDetails>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pushPriceHash, setPushPriceHash] = useState<string |undefined>();
  const [disputeHash, setDisputeHash] = useState<string | undefined>();




  const fetchData = async () => {
    try {
      const API_URL = `${process.env.API_URL || 'http://0.0.0.0:3000/node/v1/optimistic/assertions'}/${assessment.assertion_id}`;
      const response = await axios.get(API_URL);
      const assertion = response.data;
      setResolutionItem({
        domain_id : assertion.domain_id, 
        asserter: assertion.asserter, 
        disputer: assertion.disputer, 
        disputed: assertion.disputed, 
        dispute_id: assertion.dispute_id, 
        callback_recipient: assertion.callback_recipient,
        caller: assertion.caller, 
        settled: assertion.settled, 
        settle_caller: assertion.settle_caller, 
        settlement_resolution: assertion.settlement_resolution,
      })
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching assertion details:', error);      
    }
  };

  useEffect(() => {
    const updateProgressAndTime = () => {
      const start = new Date(assessment.timestamp); 
      const start_timestamp = Math.floor(start.getTime());
      const end =  new Date(assessment.expiration_time)
      const end_timestamp = Math.floor(end.getTime())
      const now = Date.now();
      const total = end_timestamp - start_timestamp;
      const current = now - start_timestamp;
      const calculatedProgress = Math.min(
        Math.max((current / total) * 100, 0),
        100
      );
      setProgress(calculatedProgress);

      // Calculate time left
      const remaining = end_timestamp - now;
      if (remaining > 0) {
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor(
          (remaining % (1000 * 60 * 60)) / (1000 * 60)
        );
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else {
        setTimeLeft("Ended");
      }
    };

    updateProgressAndTime();
    const timer = setInterval(updateProgressAndTime, 1000); // Update every second

    return () => clearInterval(timer);
  }, [assessment]);

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };
      // Settle assertion
    const { writeAsync: settleAssertion} = useContractWrite({
        calls:  [{
            contractAddress: network == 'sepolia' ? OO_CONTRACT_ADDRESS.sepolia : OO_CONTRACT_ADDRESS.mainnet ,
            entrypoint: 'settle_assertion',
            calldata: [] 
          }]
        
      });

          // Push price to ancillary
          const { writeAsync: push_price} = useContractWrite({
            calls:  [{
                contractAddress: network=='sepolia' ? ORACLE_ANCILLARY_ADDRESS.sepolia: ORACLE_ANCILLARY_ADDRESS.mainnet,
                entrypoint: 'push_price',
                calldata: [] 
              }]
            
          });
    
    // Dispute assertion
    const { writeAsync: approveAndDispute } = useContractWrite({
      calls: [
        {
          contractAddress: currency.address,
          entrypoint: 'approve',
          calldata: []
        },
        {
          contractAddress: OO_CONTRACT_ADDRESS,
          entrypoint: 'dispute_assertion',
          calldata: []
        }
      ]
    });
            // Wait for dispute transaction
  const { isLoading: isDisputeLoading, isError: isDisputeError, error: disputeError } = useWaitForTransaction({
    hash: disputeHash,
    watch: true
  });

    // Wait for resolve transaction
    const { isLoading: isResolveLoading, isError: isResolveError, error: resolveError } = useWaitForTransaction({
      hash: pushPriceHash,
      watch: true
    });
  const handleSettle = async (assertionId: number) => {

    try {
      await settleAssertion({
        calls: [
          {
            contractAddress:  network == 'sepolia' ? OO_CONTRACT_ADDRESS.sepolia : OO_CONTRACT_ADDRESS.mainnet ,
            entrypoint: 'settle_assertion',
            calldata: [assertionId.toString()]
          }
        ]
      });
      console.log(`Settled assertion with ID: ${assertionId}`);
      fetchData();
    } catch (error) {
      console.error('Error settling assertion:', error);
    }
  };


  const handleDispute = async (assertionId: number, bond: string) => {
    console.log(`Disputing item with ID: ${assertionId}`);

    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      const result = await approveAndDispute({
        calls: [
          {
            contractAddress: currency.address,
            entrypoint: 'approve',
            calldata: [OO_CONTRACT_ADDRESS, uint256.bnToUint256(bond).low, uint256.bnToUint256(bond).high]
          },
          {
            contractAddress: OO_CONTRACT_ADDRESS,
            entrypoint: 'dispute_assertion',
            calldata: [assertionId.toString(), address]
          }
        ]
      });


      console.log('Transaction hash:', result.transaction_hash);
      setDisputeHash(result.transaction_hash);

      const timeout = 120000; // 2 minutes timeout
      const startTime = Date.now();

      while (isDisputeLoading && Date.now() - startTime < timeout) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
      }

      if (isDisputeError) {
        throw new Error(`Transaction failed: ${disputeError?.message}`);
      }

      alert('Assertion disputed successfully!');
      fetchData();
    } catch (error) {
      console.error('Error disputing assertion:', error);
      alert('Failed to dispute the assertion. Check console for details.');
    } finally {
      setDisputeHash(undefined);
    }
  };

  

  const handleResolveDispute = async(assertionId: number, request_id: number, resolution: boolean) => {
    console.log(`Resolve dispute item with ID: ${assertionId}`);


    try {

      let resolutionInt = resolution ? 1000000000000000000: 0;

      const result = await push_price({
        calls:  [{
          contractAddress: network === 'sepolia' ? ORACLE_ANCILLARY_ADDRESS.sepolia: ORACLE_ANCILLARY_ADDRESS.mainnet,
          entrypoint: 'push_price_by_request_id',
          calldata: [request_id, resolutionInt] 
        }]
      }); 
       console.log('Transaction hash:', result.transaction_hash);
      setPushPriceHash(result.transaction_hash);  

      const timeout = 120000; // 2 minutes timeout
      const startTime = Date.now();

      while (isResolveLoading && Date.now() - startTime < timeout) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
      }

      if (isResolveError) {
        throw new Error(`Transaction failed: ${resolveError?.message}`);
      }

      handleSettle(assertionId);

    } catch (error) {
      console.error('Error resolving assertion:', error);
    }finally {
      setPushPriceHash(undefined);
    }
  }



  useEffect(() => {
    // Trigger the animation after the component is mounted
    setIsVisible(true);
    fetchData();
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for the animation to finish before calling onClose
  };

  return (
    <div className="fixed bottom-0 left-0 z-50 w-screen">
      <div
        className={`transform bg-darkGreen text-lightGreen shadow-lg transition-transform duration-300 ease-in-out ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "70vh", overflowY: "auto" }}
      >
        {!isLoading ? (
          <>
        <div className="sticky top-0 mb-4 flex	 items-center justify-between bg-lightBlur px-10 py-4 backdrop-blur">
          <div className="flex flex-row gap-3">
            <Image width={25} height={25} alt="Logo" src={assessment.image ? assessment.image: '/assets/vectors/optimist.svg'} />
            <h3 className="text-xl font-bold">{assessment.title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full border border-lightGreen p-2 text-lightGreen hover:bg-lightGreen hover:text-darkGreen"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4  px-10 pb-5">
          <div className="flex flex-row gap-3">
            <InformationCircleIcon className=" my-auto h-6 w-6 rounded-full text-lightGreen" />
            <h5>Assertion</h5>
          </div>
          <p>
            <div className="text-mint">Description</div>{" "}
            {assessment.description}
          </p>
          <p>
            <div className="text-mint">Assertion Id</div>{" "}
            {assessment.assertion_id}
          </p>
          <p>
            <div className="text-mint">Challenge period ends</div>{" "}
            {assessment.expiration_time}
          </p>
          <p>
            <div className="text-mint">Result</div> {assessment.identifier}
          </p>
          <p>
            <div className="text-mint">Bond</div> {assessment.bond}
          </p>
          <div className="flex flex-row gap-3">
            <ClockIcon className=" my-auto h-6 w-6 rounded-full text-lightGreen" />
            <h5>Timeline</h5>
          </div>
          <p>
            <div className="text-mint">Start challenge period</div>{" "}
            {assessment.timestamp}
          </p>
          <p>
            <div className="text-mint">End challenge period</div>{" "}
            {assessment.expiration_time}
          </p>
          <>
            <div className="h-1 w-40 rounded-full bg-lightBlur">
              <div
                className="h-1 rounded-full bg-mint transition-all duration-500 ease-out"
                style={{ width: timeLeft === "Ended" ? "100%" : `${progress}%` }}
                ></div>
            </div>
            <div className="mt-1 text-xs">Left: {timeLeft}</div>
          </>
          <div className="flex flex-row gap-3">
            <InformationCircleIcon className=" my-auto h-6 w-6 rounded-full text-lightGreen" />
            <h5>Details</h5>
          </div>
          <p>
            <div className="text-mint">Asserter</div>{" "}
            {resolutionItem.asserter}
          </p>
          <p>
            <div className="text-mint">Disputed</div>
            {resolutionItem.disputed ? 'True': 'False'}
          </p>
          <p>
            <div className="text-mint">Disputer</div>
            {resolutionItem.disputer}
          </p>
          <p>
            <div className="text-mint">Dispute Id</div>
            {resolutionItem.dispute_id}
          </p>
          <p>
            <div className="text-mint">Settled</div>
            {resolutionItem.settled ? 'True': 'False'}
          </p>
          <p>
            <div className="text-mint">Settled caller</div>
            {resolutionItem.settle_caller}
          </p>
          <p>
            <div className="text-mint">Settlement Resolution</div>
            {resolutionItem.settlement_resolution}
          </p>
        </div>
      </>): (
        
          <div className="py-2 font-mono text-xs text-lightGreen">
            Fetching ...
          </div>
      )}
         <div className="flex justify-start items-center space-x-4 py-4 pl-12">
       {
        !isLoading && !resolutionItem.settled && 
        <>        
        <WalletConnection network={network} />
        <button
                type="submit"
                className="w-fit rounded-full border border-darkGreen bg-mint py-4 px-6 text-sm uppercase tracking-wider text-darkGreen transition-colors hover:border-mint hover:bg-darkGreen hover:text-mint"
                onClick={() => handleSettle(assessment.assertion_id)}
              >
                Settle
        </button>
        </>
      } 
      { 
       !isLoading && !resolutionItem.disputed && !resolutionItem.settled &&
        <button
        type="submit"
        className="w-fit rounded-full border border-darkGreen bg-lightGreen py-4 px-6 text-sm uppercase tracking-wider text-darkGreen transition-colors hover:border-mint hover:bg-darkGreen hover:text-mint"
        onClick={() => handleDispute(assessment.assertion_id, assessment.bond)}
       >
        Dispute
     </button>
      }
      {
        !isLoading && resolutionItem.disputed && !resolutionItem.settled &&
        <>
        <button
        type="submit"
        className="w-fit rounded-full border border-darkGreen bg-lightGreen py-4 px-6 text-sm uppercase tracking-wider text-darkGreen transition-colors hover:border-mint hover:bg-darkGreen hover:text-mint"
        onClick={() => handleResolveDispute(assessment.assertion_id, Number(resolutionItem.dispute_id), true)}
       >
        Resolve True
     </button>
     <button
        type="submit"
        className="w-fit rounded-full border border-darkGreen bg-lightGreen py-4 px-6 text-sm uppercase tracking-wider text-darkGreen transition-colors hover:border-mint hover:bg-darkGreen hover:text-mint"
        onClick={() => handleResolveDispute(assessment.assertion_id, Number(resolutionItem.dispute_id), false)}
       >
        Resolve False
     </button>
     </>
      }
      </div>
      </div>
    </div>
  );
};

export default AssessmentPopup;
