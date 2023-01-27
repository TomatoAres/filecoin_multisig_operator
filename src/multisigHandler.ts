import EnvParamsProvider from './envParamsProvider';
import {Logger} from 'winston';
import {
  message,
  MsigMethod,
  MULTISIG_ACTOR_CODE_CID,
  CALIBRATION_MULTISIG_ACTOR_CODE_CID,
} from './types';
const filecoin_signer = require('@zondax/filecoin-signing-tools');

export default class FilecoinMultisigHandler {
  constructor(
    logger: Logger,
    envParamsProvider: EnvParamsProvider,
    requester: any
  ) {
    this.logger = logger;
    this.envParamsProvider = envParamsProvider;
    this.requester = requester;
  }
  logger: Logger;
  envParamsProvider: EnvParamsProvider;
  requester;

  async createMultisigAccount() {
    try {
      const selfAccount = this.envParamsProvider.getFilecoinSignerAccount();

      // 先构造交易参数
      let constructor_params = {
        Signers: this.envParamsProvider.getFilecoinAllSignerAccounts(),
        NumApprovalsThreshold: parseInt(
          this.envParamsProvider.getFilecoinMultisigThreshold()
        ),
        UnlockDuration: 0,
        StartEpoch: 0,
      };

      let params = {
        CodeCid: CALIBRATION_MULTISIG_ACTOR_CODE_CID,
        ConstructorParams: this.serializeAndFormatParams(constructor_params),
      };

      // 获取nounce
      const nonce = await this.getNonce(selfAccount);

      let create_multisig_transaction = {
        // 创建新的多签账户消息固定发送的目标地址
        to: 't01',
        from: selfAccount,
        nonce: nonce,
        // 多签账户初始化金额
        value: '0',
        gaslimit: 0,
        gasfeecap: '0',
        gaspremium: '0',
        method: MsigMethod.PROPOSE,
        params: this.serializeAndFormatParams(params),
      };

      // 获取预估gas费
      const create_multisig_transaction_with_gas = await this.getGasEstimation(
        create_multisig_transaction as message
      );

      const receipt: any = await this.signAndSendTransaction(
        create_multisig_transaction_with_gas
      );

      const cid = receipt['Message']['/'];
      console.log(`cid: ${cid}`);

      return cid;
    } catch (e) {
      this.logger.info(`error: ${e}`);
    }
  }

  async initNewMultisigTransfer(to: string, amount: string) {
    try {
      let propose_params = {
        To: to,
        Value: amount,
        Method: 0,
        Params: '',
      };

      const selfAccount = this.envParamsProvider.getFilecoinSignerAccount();
      // 获取nounce
      const nonce = await this.getNonce(selfAccount);

      let propose_multisig_transaction = {
        to: this.envParamsProvider.getFilecoinMultisigAddress(),
        from: selfAccount,
        nonce: nonce,
        value: '0',
        gaslimit: 0,
        gasfeecap: '0',
        gaspremium: '0',
        method: MsigMethod.PROPOSE,
        params: this.serializeAndFormatParams(propose_params),
      };

      // 获取预估gas费
      const propose_multisig_transaction_with_gas = await this.getGasEstimation(
        propose_multisig_transaction as message
      );

      const receipt: any = await this.signAndSendTransaction(
        propose_multisig_transaction_with_gas
      );

      const cid = receipt['Message']['/'];
      console.log(`cid: ${cid}`);

      return cid;
    } catch (e) {
      this.logger.info(`error: ${e}`);
    }
  }

  async approveMultisigTransfer(
    to: string,
    amount: string,
    // propose主账号发起这笔交易的cid
    txCid: string
  ) {
    try {
      const selfAccount = this.envParamsProvider.getFilecoinSignerAccount();

      let proposal_params = {
        // Requester: this.envParamsProvider.getFilecoinMainNodeAddress(),
        Requester: this.envParamsProvider.getFilecoinMainNodeAddress(),
        To: to,
        Value: amount,
        Method: 0,
        Params: '',
      };

      const proposalHash = filecoin_signer.computeProposalHash(proposal_params);
      const receiptMessage = await this.waitTransactionReceipt(txCid);
      const recpt = JSON.parse(JSON.stringify(receiptMessage));

      const txnid = recpt['ReturnDec']['TxnID'];
      console.log(`txnid: ${txnid}`);

      let approve_params = {
        ID: txnid,
        ProposalHash: proposalHash.toString('base64'),
      };

      console.log(approve_params);

      // 获取nounce
      const nonce = await this.getNonce(selfAccount);

      let approve_multisig_transaction = {
        to: this.envParamsProvider.getFilecoinMultisigAddress(),
        from: selfAccount,
        nonce: nonce,
        value: '0',
        gaslimit: 0,
        gasfeecap: '0',
        gaspremium: '0',
        method: MsigMethod.APPROVE,
        params: this.serializeAndFormatParams(approve_params),
      };

      // 获取预估gas费
      const approve_multisig_transaction_with_gas = await this.getGasEstimation(
        approve_multisig_transaction as message
      );

      const receipt: any = await this.signAndSendTransaction(
        approve_multisig_transaction_with_gas
      );

      const cid = receipt['Message']['/'];
      console.log(`cid: ${cid}`);

      return cid;
    } catch (e) {
      this.logger.info(`error: ${e}`);
    }
  }

  // 获取某个账户的nonce
  async getNonce(address: string) {
    return new Promise(resolve => {
      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.MpoolGetNonce',
          id: 1,
          params: [address],
        })
        .then((response: any) => {
          resolve(response.data.result);
        });
    });
  }

  // 获取gas fee estimation
  async getGasEstimation(message: message) {
    return new Promise(resolve => {
      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.GasEstimateMessageGas',
          id: 1,
          params: [message, {MaxFee: '0'}, null],
        })
        .then((response: any) => {
          console.log(`gas result: ${JSON.stringify(response.data)}`);
          resolve(response.data.result);
        });
    });
  }

  // 获取gas fee estimation
  async sendMessage(signed_message: any) {
    return new Promise(resolve => {
      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.MpoolPush',
          id: 1,
          params: [JSON.parse(signed_message)],
        })
        .then((response: any) => {
          resolve(response.data.result);
        });
    });
  }

  // 让参数serialize序列化变成一个hex string，然后转成buffer raw data，然后再转成base64格式的string,用于传到lotus服务器
  serializeAndFormatParams(params: any) {
    const serializedParams = filecoin_signer.serializeParams(params);
    const formatedRawData = this.hexToBase64(serializedParams);

    return formatedRawData;
  }

  // base64格式转成raw data格式,用于将私钥暂存于buffer里
  base64ToBufferRawData(param: any) {
    return Buffer.from(param, 'base64');
  }

  // hex格式转成raw data格式,用于将私钥暂存于buffer里
  hexToBufferRawData(param: any) {
    return Buffer.from(param, 'hex');
  }

  // hex格式转成base64
  hexToBase64(param: any) {
    return Buffer.from(param, 'hex').toString('base64');
  }

  // 获取私钥
  getPrivateKey() {
    const recovered_key = filecoin_signer.keyRecover(
      this.hexToBufferRawData(this.envParamsProvider.getFilecoinPrivateKey())
    );

    const privateKey = this.base64ToBufferRawData(recovered_key.private_base64);

    return privateKey;
  }

  // 签名，并发送至lotus服务器上
  async signAndSendTransaction(transactionWithGas: any) {
    return new Promise(resolve => {
      try {
        const signed_transaction_multisig =
          filecoin_signer.transactionSignLotus(
            transactionWithGas,
            this.getPrivateKey()
          );

        this.sendMessage(signed_transaction_multisig).then(result => {
          let messageCid = JSON.parse(JSON.stringify(result))['/'];
          this.waitTransactionReceipt(messageCid).then(receiptMessage => {
            const receipt = JSON.parse(JSON.stringify(receiptMessage));
            // if the transaction is not propose, the returnDec doesn't have txnid
            let txnid = receipt['ReturnDec']['TxnID'];
            console.log(`txnid: ${txnid}`);
            resolve(receipt);
          });
        });
      } catch (e) {
        this.logger.info(`error: ${e}`);
      }
    });
  }

  /** block and wait for receiving transaction receipt
   * response.data.result example
   * {
   * "Message":{"/":"bafy2bzacecdfpyliqoeha56kiiqyi3bno44fujsnlpwae5uo57p3p5eccnvuo"},
   * "Receipt":{"ExitCode":0,"Return":"hBL0AEA=","GasUsed":12003601},
   * "ReturnDec":{"TxnID":18,"Applied":false,"Code":0,"Ret":null},
   * "TipSet":[{"/":"bafy2bzaceazcmwrcrnhqb74w3sviyaymo227fuuoqzy4tcuqqinbud53sow3q"}],
   * "Height":245935
   * }
   */
  async waitTransactionReceipt(transactionCid: any) {
    return new Promise(resolve => {
      const formatted_cid = {
        '/': transactionCid,
      };

      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.StateWaitMsg',
          id: 1,
          // 【cid, confidence】
          params: [formatted_cid, null, 5000, true],
        })
        .then((response: any) => {
          resolve(response.data.result);
        });
    });
  }

  /** 获取某个交易cid的具体信息
   * response.data.result示例
   * {
   * "Message":{"/":"bafy2bzacecy6am3guec4xpsb4mamurrah6amqa56zm2fx6p7jvupk4cwcvwoe"},
   * "Receipt":{"ExitCode":0,"Return":null,"GasUsed":489268},
   * "ReturnDec":null,
   * "TipSet":[{"/":"bafy2bzacechqn7bzzbfa5mvonk5bbgz75fnndcail5vct6gfrssaoqmbml2da"},{"/":"bafy2bzacecckdjfkwhrd36pdvcrczzbrlf3jcm5t2jfhs4fedspdxqhzoiedi"}],
   * "Height":241463
   * }
   */
  async getTransactionReceipt(transactionCid: any) {
    return new Promise(resolve => {
      const formatted_cid = {
        '/': transactionCid,
      };

      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.StateSearchMsg',
          id: 1,
          // 【from(tipSet), cid, limit(epochs), replace_or_not】
          params: [null, formatted_cid, 5000, true],
        })
        .then((response: any) => {
          console.log(
            `getTransactionReceipt result: ${JSON.stringify(
              response.data.result
            )}`
          );
          resolve(response.data.result);
        });
    });
  }

  // transfer some amount of money from a non-multisig account(set in the .env file) to any account
  async simpleTransfer(to: string, amount: string) {
    try {
      const selfAccount = this.envParamsProvider.getFilecoinSignerAccount();

      // 获取nounce
      const nonce = await this.getNonce(selfAccount);

      const transfer_transaction = {
        to,
        from: selfAccount,
        nonce: nonce,
        value: amount,
        gaslimit: 0,
        gasfeecap: '0',
        gaspremium: '0',
        method: 0,
        params: '',
      };

      // 获取预估gas费
      const transfer_transaction_with_gas = await this.getGasEstimation(
        transfer_transaction as message
      );

      const receipt: any = await this.signAndSendTransaction(
        transfer_transaction_with_gas
      );

      const cid = receipt['Message']['/'];
      console.log(`cid: ${cid}`);

      return cid;
    } catch (e) {
      this.logger.info(`error: ${e}`);
    }
  }

  /** 获取某个from或to地址的所有消息cid
   * response.data.result example:
   * [
   * {"/":"bafy2bzacecy6am3guec4xpsb4mamurrah6amqa56zm2fx6p7jvupk4cwcvwoe"},
   * {"/":"bafy2bzaceawjirlh4cn4gtpvcic37wi3eqnwg45wdpbog5ndjmg2jrxolcr6g"}
   * ]
   */
  async getStateListMessages(
    to: any = null,
    from: any = null,
    toHeight: any = null
  ) {
    return new Promise(resolve => {
      try {
        let message: any = {};
        if (to) {
          message = {
            To: to,
          };
        }

        if (from) {
          message['From'] = from;
        }

        if (!Object.keys(message).length) {
          throw Error('Either to or from address should be provided!');
        }

        this.requester
          .post('', {
            jsonrpc: '2.0',
            method: 'Filecoin.StateListMessages',
            id: 1,
            // 【message with from/to address, tipSet, toHeight】
            params: [message, null, toHeight],
          })
          .then((response: any) => {
            resolve(response.data.result);
          });
      } catch (e) {
        this.logger.info(`error: ${e}`);
      }
    });
  }

  /** Get message info by message cid
   * response.data.result example:
   * {
   * "Version":0,
   * "To":"t2d3ncmmmtxkvqhy7sltnvo4rgvczegl4wkpzlmna",
   * "From":"t1rd2qsvcbj6wqg2zetwv5an7m3xzjm7jagmghkai",
   * "Nonce":1,
   * "Value":"100000000000000000000",
   * "GasLimit":605085,
   * "GasFeeCap":"101737",
   * "GasPremium":"100683",
   * "Method":0,
   * "Params":null,
   * "CID":{"/":"bafy2bzacecnhg3uyi7verqio5wfwbrwguvidjcqfxf4vfx2fjyrfbvbvwjyzo"}},
   * "id":1
   * }
   */
  async getMessageInfoByCid(messageCid: string) {
    return new Promise(resolve => {
      try {
        const cid = {'/': messageCid};

        this.requester
          .post('', {
            jsonrpc: '2.0',
            method: 'Filecoin.ChainGetMessage',
            id: 1,
            params: [cid],
          })
          .then((response: any) => {
            resolve(response.data.result);
          });
      } catch (e) {
        this.logger.info(`error: ${e}`);
      }
    });
  }

  // ChainGetBlock
  async getBlockByCid(messageCid: string) {
    return new Promise(resolve => {
      try {
        const cid = {'/': messageCid};

        this.requester
          .post('', {
            jsonrpc: '2.0',
            method: 'Filecoin.ChainGetBlock',
            id: 1,
            params: [cid],
          })
          .then((response: any) => {
            resolve(response.data.result);
          });
      } catch (e) {
        this.logger.info(`error: ${e}`);
      }
    });
  }

  /**
   * [
   * {
   * "Version":0,
   * "To":"t2d3ncmmmtxkvqhy7sltnvo4rgvczegl4wkpzlmna",
   * "From":"t1rd2qsvcbj6wqg2zetwv5an7m3xzjm7jagmghkai",
   * "Nonce":1,
   * "Value":"100000000000000000000",
   * "GasLimit":605085,
   * "GasFeeCap":"101737",
   * "GasPremium":"100683",
   * "Method":0,
   * "Params":null,
   * "CID":{"/":"bafy2bzacecnhg3uyi7verqio5wfwbrwguvidjcqfxf4vfx2fjyrfbvbvwjyzo"}
   * },
   * {
   * "Version":0,
   * "To":"t01",
   * "From":"t1rd2qsvcbj6wqg2zetwv5an7m3xzjm7jagmghkai",
   * "Nonce":0,
   * "Value":"0",
   * "GasLimit":18840427,
   * "GasFeeCap":"102103",
   * "GasPremium":"101049",
   * "Method":2,
   * "Params":"gtgqWCcAAVWg5AIgvGYj9BUVHYVe+BQL2aZx7bXI23BqMGTsKceSrVLKtzNYR4SDVQHLu57Kvg8YIWHP1qWIhdju96wDR1UB8a9p+toNqwabgh4DH9n7yJgPZAJVAYj1CVRBT60DaySdq9A37N3yln0gAgAA",
   * "CID":{"/":"bafy2bzacealefktopof6n3e3d5jra3es635o5icq3rkdvxejnqqm2sn3yaloc"}
   * }
   * ]
   */
  async getMessageInfoPromisesForCids(messages: any[]) {
    return Promise.all(
      messages.map(message => {
        return this.getMessageInfoByCid(message['/']).then(
          (messageInfo: any) => {
            let info = JSON.parse(JSON.stringify(messageInfo));
            info['msgCid'] = message['/'];
            return info;
          }
        );
      })
    );
  }

  // 获取某个账号从指定区块号后的所有交易，并分类
  async processAccountMessages(
    to: any = null,
    from: any = null,
    toHeight: any = null
  ) {
    return new Promise(resolve => {
      let transferInList: any[] = [],
        proposalList: any[] = [],
        approvalList: any[] = [];
      this.getStateListMessages(to, from, toHeight).then((messageList: any) => {
        this.getMessageInfoPromisesForCids(messageList).then(
          async (messages: any) => {
            // Multisig Account variations
            const msigAddress =
              this.envParamsProvider.getFilecoinMultisigAddress();
            const msigId =
              this.envParamsProvider.getFilecoinMultisigAddressId();
            const msigRobust =
              this.envParamsProvider.getFilecoinMultisigRobustAddress();

            // SelfAccount
            const selfAccount =
              this.envParamsProvider.getFilecoinSignerAccount();

            for (let message of messages) {
              if (
                message['To'] == msigAddress ||
                message['To'] == msigId ||
                message['To'] == msigRobust
              ) {
                let receipt: any = await this.waitTransactionReceipt(
                  message['msgCid']
                );

                if (message['Method'] == 0) {
                  let newTransfer: any = {};
                  newTransfer['msgCid'] = message['msgCid'];
                  newTransfer['Height'] = receipt['Height'];
                  newTransfer['From'] = message['From'];
                  newTransfer['To'] = msigAddress;
                  newTransfer['Value'] = message['Value'];
                  transferInList.push(newTransfer);
                } else if (message['Method'] == 2) {
                  // 先解码proposal的参数
                  let decodedParam: any = await this.decodeParams(
                    msigAddress,
                    2,
                    message['Params']
                  );

                  // 只有proposal是个转账的proposal，我们才留它
                  if (decodedParam['Method'] == 0) {
                    // proposal信息要重构
                    let newProposal: any = {};
                    newProposal['msgCid'] = message['msgCid'];
                    newProposal['TxnID'] = receipt['ReturnDec']['TxnID'];
                    newProposal['Height'] = receipt['Height'];
                    newProposal['From'] = msigAddress;
                    newProposal['To'] = decodedParam['To'];
                    newProposal['Value'] = decodedParam['Value'];
                    proposalList.push(newProposal);
                  }
                } else if (message['Method'] == 3) {
                  // 只有成功执行的或者我自己账号approve过的才进入到approvallist里
                  // 这个名单存在的目的是用于排除不需要处理的proposal
                  if (
                    receipt['ReturnDec']['Applied'] ||
                    (message['From'] = selfAccount)
                  ) {
                    // 解码approval的参数
                    let decodedParam: any = await this.decodeParams(
                      msigAddress,
                      3,
                      message['Params']
                    );

                    let newApproval: any = {};
                    newApproval['msgCid'] = message['msgCid'];
                    newApproval['TxnID'] = decodedParam['ID'];
                    newApproval['Height'] = receipt['Height'];

                    if (receipt['ReturnDec']['Applied']) {
                      newApproval['Applied'] = true;
                    } else {
                      newApproval['Applied'] = false;
                    }

                    approvalList.push(newApproval);
                  }
                }
              }
            }
            resolve({
              transferInList,
              proposalList,
              approvalList,
            });
          }
        );
      });
    });
  }

  /** 解码params Approval example:
   * @param toAddress: "t2d3ncmmmtxkvqhy7sltnvo4rgvczegl4wkpzlmna"
   * @param method: 3 (Multisig Approve)
   * @param params: "ghJYIOIBs9OqQKksmLclx43ShoHBqiPASQMtB2Fn6lpivpIa"
   * @returns {"ID":18,"ProposalHash":"4gGz06pAqSyYtyXHjdKGgcGqI8BJAy0HYWfqWmK+kho="}
   *
   * 解码params Propose example:
   * @param toAddress: "t2d3ncmmmtxkvqhy7sltnvo4rgvczegl4wkpzlmna"
   * @param method: 2 (Multisig Propose)
   * @param params: "hFUBy7ueyr4PGCFhz9aliIXY7vesA0dJABvBbWdOyAAAAEA="
   * @returns {"To":"t1zo5z5sv6b4mccyop22syrboy5332ya2h5s6gxca","Value":"2000000000000000000","Method":0,"Params":null}
   */
  async decodeParams(toAddress: string, method: number, params: string) {
    return new Promise(resolve => {
      this.requester
        .post('', {
          jsonrpc: '2.0',
          method: 'Filecoin.StateDecodeParams',
          id: 1,
          // 【toAddress, method num, encoded params, tipset】
          params: [toAddress, method, params, null],
        })
        .then((response: any) => {
          resolve(response.data.result);
        });
    });
  }
}
