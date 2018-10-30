import React, { Component } from "react";
import styled from "styled-components";
import IPFS from "ipfs-mini";
import parse from "domain-name-parser";
import axios from "axios";
import abiDecoder from "abi-decoder";
import { Router, Link } from "../routes";
import { css } from "glamor";
import isIPFS from "is-ipfs";

import Leaderboard from "../components/Leaderboard";
import DonationForm from "../components/DonationForm";
import NotAnAddreth from "../components/NotAnAddreth";
import Button from "../components/Button";

import QRCode from "qrcode.react";

let qrCodeStyle = css({
  padding: "1rem",
  width: "300",
  height: "300",
  justifySelf: "end"
});
import { Subscribe } from "laco-react";

import { Web3Store, initMetaMask, ensLookup } from "../stores/web3";

const Container = styled.div`
  max-width: 100vw;
  display: grid;
  grid-template-columns: (auto-fill, 1fr);
  grid-template-rows: auto auto;
  padding: 2rem;
  min-height: 100vh;
  color: white;
  grid-gap: 2rem;

  background: linear-gradient(180deg, #6200ee 0%, rgba(98, 0, 238, 0.49) 100%),
    #c4c4c4;

  @media (max-width: 640px) {
    width: 100vw;
    grid-template-columns: (auto-fill, 1fr);
  }
`;
const LeaderboardContainer = styled.div`
  display: grid;
  grid-column: 1 / span 2;
`;

const AddrethLink = styled.a`
  word-wrap: wrap;
  color: #03dac6;
  font-weight: 100;
  font-size: 1.5rem;
  text-decoration: none;
  justify-self: center;
  align-self: starts;
  grid-row: 1;
  grid-column: 1 / span 2;
  padding: 2rem;
`;

const Wrapper = styled.div`
  padding: 0 2rem;
  min-height: 100vh;
  background: linear-gradient(180deg, #6200ee 0%, rgba(98, 0, 238, 0.49) 100%),
    #c4c4c4;
`;

const Navbar = styled.div`
  height: 4rem;
  color: white;
  background-color: black;
  display: flex;
  align-items: center;
`;

const Brand = styled.img`
  height: 50%;
  margin-left: 1rem;
  margin-right: 1rem;
  cursor: pointer;
`;

const Title = styled.input`
  border-radius: 0.2rem;
  padding: 0.3rem;
`;

const Description = styled.textarea`
  border-radius: 0.2rem;
  padding: 0.3rem;
`;

const ContentWrapper = styled.div`
  margin-bottom: 4rem;
  display: flex;
  flex-direction: column;
`;
const EditContainer = styled.div`
  display: grid;
  grid-gap: 1rem;
`;

const ClaimContainer = styled.div`
  padding-top: 1rem;
`;

const Input = styled.input`
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial,
    sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  border: 1px solid white;
  border-radius: 3px;
  padding-left: 0.25rem;
  width: 100%;
  font-size: 20px;
  &:focus {
    outline: none;
  }

  @media (max-width: 640px) {
    max-width: 120px;
  }
`;

const Loading = styled.div`
  justify-self: center;
`;
export default class Addreth extends Component {
  state = {
    editTitle: false,
    titleValue: "",
    editDescription: false,
    descriptionValue: "",
    isAddrethValid: true,
    isAddrethValidated: false,
    editMode: false,
    claimed: false,
    dataLoaded: false,
    address: "",
    ensDomain: "",
    error: false
  };
  vanityaddress = "0x1337000000000000000000000000000000000000";

  static async getInitialProps({ query }) {
    return query;
  }

  constructor() {
    super();
    this.ipfs = new IPFS({
      host: "ipfs.web3.party",
      port: 5001,
      protocol: "https"
    });
    this.abi = [
      {
        constant: false,
        inputs: [
          {
            name: "_ipfsHash",
            type: "string"
          }
        ],
        name: "saveEth",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function"
      }
    ];
    abiDecoder.addABI(this.abi);
  }

  async componentDidMount() {
    const { addreth } = this.props;
    const { web3 } = Web3Store.get();

    initMetaMask();

    if (web3.utils.isAddress(addreth)) {
      this.findAddress(addreth);
      this.setState({ address: addreth });
    } else {
      try {
        const address = await ensLookup(addreth);
        this.findAddress(address);
        this.setState({ address, ensDomain: addreth });
      } catch (error) {
        this.setState({ error: true });
      }
    }
  }

  validateENSDomain(addreth) {
    const domain = parse(addreth);
    return domain.tld == "eth";
  }

  handleTitle = e => {
    this.setState({ titleValue: e.target.value });
    if (e.keyCode === 13) {
      this.setState({ editTitle: false });
    }
  };

  handleDescription = e => {
    this.setState({ descriptionValue: e.target.value });
    if (e.keyCode === 13) {
      this.setState({
        editDescription: false
      });
    }
  };

  // save data on IPFS & send transaction immediately
  saveData = () => {
    const { web3, account } = Web3Store.get();
    this.setState({
      editMode: false,
      claimed: true
    });
    return new Promise((resolve, reject) => {
      const msgParams = this.makeData();
      this.ipfs.addJSON({ payload: msgParams }, (err, result) => {
        let message = web3.utils.toHex(result);

        web3.eth.sendTransaction(
          {
            from: account,
            to: this.vanityaddress,
            data: message,
            gas: 300000
          },
          (err, hash) => {
            if (err) {
              return reject(err);
            }
            resolve(hash);
          }
        );
      });
    });
  };

  makeData = () => {
    const msgParams = [
      {
        type: "string",
        name: "title",
        value: this.state.titleValue
      },
      {
        type: "string",
        name: "description",
        value: this.state.descriptionValue
      }
    ];
    return msgParams;
  };

  findAddress = () => {
    const { web3 } = Web3Store.get();
    const bs =
      "https://api-ropsten.etherscan.io/api?module=account&action=txlist&address=" +
      //      `https://ipfs.web3.party:5001/corsproxy?module=account&action=txlist&address=` +
      this.vanityaddress;
    axios
      .get(bs, {
        //headers: {
        // Authorization: '',
        // 'Target-URL': 'https://blockscout.com/eth/ropsten/api',
        //},
      })
      .then(response => {
        // handle success
        if (response.data && response.data.status === "1") {
          response.data.result.sort(function(a, b) {
            return parseInt(a.timeStamp) - parseInt(b.timeStamp);
          });
          let newestHash = null;
          for (let i = 0; i < response.data.result.length; i++) {
            var t = response.data.result[i];
            if (t.from === this.state.address.toLowerCase()) {
              const decodedInput = web3.utils.hexToUtf8(t.input);
              if (isIPFS.multihash(decodedInput)) {
                newestHash = decodedInput;
              }
            }
          }
          if (newestHash) {
            this.ipfs.catJSON(newestHash, (err, result) => {
              if (err) {
                console.log(err);
              }
              if (result && result.payload) {
                let arrayToObject = result.payload.reduce((acc, cur) => {
                  acc[cur.name] = cur.value;
                  return acc;
                }, {});
                this.setState({ dataLoaded: true, ipfsPayload: arrayToObject });
              }
            });
          } else {
            this.setState({ dataLoaded: true });
          }
        }
      })
      .catch(function(error) {
        // handle error
        console.log(error);
      });
  };

  renderBody(dataLoaded) {
    const { error, address } = this.state;
    if (!dataLoaded && !error) {
      return <Loading>Back in the tube and staining...</Loading>;
    } else if (error) {
      return <NotAnAddreth />;
    } else {
      return (
        <Container>
          <AddrethLink
            href={`https://blockscout.com/eth/ropsten/address/${address}`}
            target="_blank"
          >
            {address}
          </AddrethLink>
          <QRCode
            className={`${qrCodeStyle}`}
            renderAs={`svg`}
            fgColor={`#2d0072`}
            bgColor={`#89e5ff00`}
            value={this.props.addreth}
          />

          <DonationForm address={address} donationNetworkID={0} />
          <LeaderboardContainer>
            <Leaderboard address={address} />
          </LeaderboardContainer>
        </Container>
      );
    }
  }

  render() {
    const { address } = this.state;
    const {
      titleValue,
      descriptionValue,
      editMode,
      ipfsPayload,
      claimed,
      dataLoaded,
      ensDomain
    } = this.state;

    return (
      <Subscribe to={[Web3Store]}>
        {({ account }) => {
          const isOwner = account === address.toLowerCase();
          return (
            <div>
              <Navbar>
                <Link route="/">
                  <Brand src="../static/images/brand.svg" />
                </Link>
                <p>{address}</p>
                {ensDomain && (
                  <>
                    <Brand src="../static/images/ens.svg" />
                    <p>{ensDomain}</p>
                  </>
                )}
                <Button
                  light
                  onClick={() => {
                    Router.push(`/address/${account}`);
                  }}
                >
                  Go to my addreth
                </Button>
              </Navbar>
              <Container>
                <div>
                  <ContentWrapper>
                    {!editMode && (
                      <>
                        <h1>
                          {titleValue || (ipfsPayload && ipfsPayload.title)}
                        </h1>
                        <p>
                          {descriptionValue ||
                            (ipfsPayload && ipfsPayload.description)}
                        </p>
                      </>
                    )}
                    {editMode && (
                      <EditContainer>
                        <Title
                          type="text"
                          placeholder="Enter your title!"
                          onChange={e =>
                            this.setState({ titleValue: e.target.value })
                          }
                        />
                        <Description
                          placeholder="Enter your description!"
                          onChange={e =>
                            this.setState({ descriptionValue: e.target.value })
                          }
                        />
                        <Button light onClick={this.saveData}>
                          Save
                        </Button>
                      </EditContainer>
                    )}
                    {!editMode &&
                      dataLoaded &&
                      isOwner && (
                        <ClaimContainer>
                          <Button
                            light
                            onClick={() => this.setState({ editMode: true })}
                          >
                            {ipfsPayload || claimed ? "Edit" : "Claim now!"}
                          </Button>
                        </ClaimContainer>
                      )}
                  </ContentWrapper>
                </div>
                {this.renderBody(dataLoaded)}
              </Container>
            </div>
          );
        }}
      </Subscribe>
    );
  }
}
