const filecoin_signer = require('@zondax/filecoin-signing-tools');
const bip39 = require('bip39');
const bip32 = require('bip32');
const axios = require('axios');

// const URL = process.env.URL;
// const TOKEN = process.env.TOKEN;

const URL = 'http://203.127.96.147:20104/rpc/v1';
const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJBbGxvdyI6WyJyZWFkIiwid3JpdGUiLCJzaWduIiwiYWRtaW4iXX0.aXbcDstQrf54HKEsyAOH1bUgHq1XwIkOa8Fd6r3Amy8';

const headers = {Authorization: `Bearer ${TOKEN}`};

async function main() {
  let response;
  const recovered_key = filecoin_signer.keyRecover(
    Buffer.from(
      'e6f8b5c39cf105c77c3ff89db7d8752715e532947ae24d420d70c6d363882b1f',
      'hex'
    )
  );
  const privateKeyBase64 = recovered_key.private_base64;
  const privateKey = Buffer.from(privateKeyBase64, 'base64');

  console.log('privateKey:', privateKeyBase64);
  /* Import private key */
  // response = await axios.post(
  //   URL,
  //   {
  //     jsonrpc: '2.0',
  //     method: 'Filecoin.WalletImport',
  //     id: 1,
  //     params: [{Type: 'secp256k1', PrivateKey: privateKeyBase64}],
  //   },
  //   {headers}
  // );

  // console.log(response.data);

  // /* Get miner address with funds */
  // response = await axios.post(
  //   URL,
  //   {
  //     jsonrpc: '2.0',
  //     method: 'Filecoin.WalletList',
  //     id: 1,
  //     params: [],
  //   },
  //   {headers}
  // );

  // let address = response.data.result[1];
  // console.log(address);

  // //   /* Get nonce */

  // response = await axios.post(
  //   URL,
  //   {
  //     jsonrpc: '2.0',
  //     method: 'Filecoin.MpoolGetNonce',
  //     id: 1,
  //     params: [address],
  //   },
  //   {headers}
  // );

  // console.log(response.data);
  //   let nonce = response.data.result;

  //   response = await axios.post(
  //     URL,
  //     {
  //       jsonrpc: '2.0',
  //       method: 'Filecoin.WalletSignMessage',
  //       id: 1,
  //       params: [
  //         address,
  //         {
  //           From: address,
  //           To: 't137sjdbgunloi7couiy4l5nc7pd6k2jmq32vizpy',
  //           Nonce: nonce,
  //           GasPrice: '1',
  //           GasLimit: 1000000,
  //           Method: 0,
  //           Value: '10000000000',
  //           Params: '',
  //         },
  //       ],
  //     },
  //     {headers}
  //   );

  //   console.log(response.data);
  //   let signedMessage = response.data.result;

  //   /* Send signed tx */

  //   response = await axios.post(
  //     URL,
  //     {
  //       jsonrpc: '2.0',
  //       method: 'Filecoin.MpoolPush',
  //       id: 1,
  //       params: [signedMessage],
  //     },
  //     {headers}
  //   );

  //   console.log(response.data);

  //   let cid = response.data.result;

  //   /* Wait for message */

  //   response = await axios.post(
  //     URL,
  //     {
  //       jsonrpc: '2.0',
  //       method: 'Filecoin.StateWaitMsg',
  //       id: 1,
  //       params: [cid, null],
  //     },
  //     {headers}
  //   );

  //   console.log(response.data);

  //   /* Create multisig */

  //   response = await axios.post(
  //     URL,
  //     {
  //       jsonrpc: '2.0',
  //       method: 'Filecoin.MpoolGetNonce',
  //       id: 1,
  //       params: ['t137sjdbgunloi7couiy4l5nc7pd6k2jmq32vizpy'],
  //     },
  //     {headers}
  //   );

  //   console.log(response.data);
  //   nonce = response.data.result;

  //   let addresses = [
  //     't137sjdbgunloi7couiy4l5nc7pd6k2jmq32vizpy',
  //     't1d2xrzcslx7xlbbylc5c3d5lvandqw4iwl6epxba',
  //   ];
  //   let sender_address = 't137sjdbgunloi7couiy4l5nc7pd6k2jmq32vizpy';

  //   let create_multisig_transaction = filecoin_signer.createMultisig(
  //     sender_address,
  //     addresses,
  //     '10000',
  //     1,
  //     nonce
  //   );
  //   let signed_create_multisig = filecoin_signer.transactionSignLotus(
  //     create_multisig_transaction,
  //     privateKey
  //   );

  //   console.log(signed_create_multisig);

  //   response = await axios.post(
  //     URL,
  //     {
  //       jsonrpc: '2.0',
  //       method: 'Filecoin.MpoolPush',
  //       id: 1,
  //       params: [JSON.parse(signed_create_multisig)],
  //     },
  //     {headers}
  //   );

  //   console.log(response.data);
  //   cid = response.data.result;

  //   /* Wait for message */

  //   response = await axios.post(
  //     URL,
  //     {
  //       jsonrpc: '2.0',
  //       method: 'Filecoin.StateWaitMsg',
  //       id: 1,
  //       params: [cid, null],
  //     },
  //     {headers}
  //   );

  //   console.log(response.data.result.ReturnDec);
  //   let actorAddress = response.data.result.ReturnDec.IDAddress;

  //   /* Propose multisig */

  //   response = await axios.post(
  //     URL,
  //     {
  //       jsonrpc: '2.0',
  //       method: 'Filecoin.MpoolGetNonce',
  //       id: 1,
  //       params: ['t137sjdbgunloi7couiy4l5nc7pd6k2jmq32vizpy'],
  //     },
  //     {headers}
  //   );

  //   console.log(response.data);
  //   nonce = response.data.result;

  //   let propose_multisig_transaction = filecoin_signer.proposeMultisig(
  //     actorAddress,
  //     't137sjdbgunloi7couiy4l5nc7pd6k2jmq32vizpy',
  //     't137sjdbgunloi7couiy4l5nc7pd6k2jmq32vizpy',
  //     '1000',
  //     nonce
  //   );

  //   let signed_propose_multisig = filecoin_signer.transactionSignLotus(
  //     propose_multisig_transaction,
  //     privateKey
  //   );

  //   console.log(signed_propose_multisig);

  //   response = await axios.post(
  //     URL,
  //     {
  //       jsonrpc: '2.0',
  //       method: 'Filecoin.MpoolPush',
  //       id: 1,
  //       params: [JSON.parse(signed_propose_multisig)],
  //     },
  //     {headers}
  //   );

  //   console.log(response.data);
  //   cid = response.data.result;

  //   /* Wait for message */

  //   response = await axios.post(
  //     URL,
  //     {
  //       jsonrpc: '2.0',
  //       method: 'Filecoin.StateWaitMsg',
  //       id: 1,
  //       params: [cid, null],
  //     },
  //     {headers}
  //   );

  //   console.log(response.data.result);
}

main();
