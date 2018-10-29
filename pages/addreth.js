import React, { Component } from 'react'
import styled from 'styled-components'
import Web3 from 'web3'
import IPFS from 'ipfs-mini'
import parse from 'domain-name-parser'
import axios from 'axios'
import abiDecoder from 'abi-decoder'

import { Router, Link } from '../routes'
import Leaderboard from '../components/Leaderboard'
import DonationForm from '../components/DonationForm'
import NotAnAddreth from '../components/NotAnAddreth'
import Utils from '../utils'
import Button from '../components/Button'

import { Web3Store } from '../stores/web3'

const Container = styled.div`
  max-width: 100vw;
  display: grid;
  grid-template-columns: (auto-fill, 1fr);
  justify-content: center;
  align-content: start;
  padding: 2rem;
  min-height: 100vh;
  color: white;

  background: linear-gradient(180deg, #6200ee 0%, rgba(98, 0, 238, 0.49) 100%),
    #c4c4c4;

  @media (max-width: 640px) {
    width: 100vw;
    grid-template-columns: (auto-fill, 1fr);
  }
`
const LeaderboardContainer = styled.div`
  display: grid;
  grid-column: 1 / span 2;
`

const AddrethLink = styled.a`
  word-wrap: wrap;
  color: #03dac6;
  font-weight: 100;
  font-size: 1.5rem;
  text-decoration: none;
  justify-self: center;
  align-self: starts;
`

const Wrapper = styled.div`
  padding: 0 2rem;
  min-height: 100vh;
  background: linear-gradient(180deg, #6200ee 0%, rgba(98, 0, 238, 0.49) 100%),
    #c4c4c4;
`

const Navbar = styled.div`
  height: 4rem;
  color: white;
  background-color: black;
  display: flex;
  align-items: center;
`

const Brand = styled.img`
  height: 50%;
  margin-left: 1rem;
  margin-right: 1rem;
  cursor: pointer;
`

const Title = styled.input`
  border-radius: 0.2rem;
  padding: 0.3rem;
`

const Description = styled.textarea`
  border-radius: 0.2rem;
  padding: 0.3rem;
`

const ContentWrapper = styled.div`
  margin-bottom: 4rem;
  display: flex;
  flex-direction: column;
`
const EditContainer = styled.div`
  display: grid;
  grid-gap: 1rem;
`

const ClaimContainer = styled.div`
  padding-top: 1rem;
`

const Input = styled.input`
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial,
    sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
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
`

export default class Addreth extends Component {
  state = {
    editTitle: false,
    titleValue: '',
    editDescription: false,
    descriptionValue: '',
    isAddrethValid: true,
    isAddrethValidated: false,
    editMode: false,
    claimed: false,
    dataloaded: false,
  }

  static async getInitialProps({ query }) {
    return query
  }

  constructor() {
    super()
    this.ipfs = new IPFS({
      host: 'ipfs.web3.party',
      port: 5001,
      protocol: 'https',
    })
    this.abi = [
      {
        constant: false,
        inputs: [
          {
            name: '_ipfsHash',
            type: 'string',
          },
        ],
        name: 'saveEth',
        outputs: [],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ]
    abiDecoder.addABI(this.abi)
  }

  componentDidMount() {
    this.findAddress(this.props.addreth)
    this.ensureEthAddress(this.props.addreth)
    this.validateAddreth(this.props.addreth)
  }

  validateENSDomain(addreth) {
    const domain = parse(addreth)
    return domain.tld == 'eth'
  }

  handleTitle = e => {
    this.setState({ titleValue: e.target.value })
    if (e.keyCode === 13) {
      this.setState({ editTitle: false })
    }
  }

  handleDescription = e => {
    this.setState({ descriptionValue: e.target.value })
    if (e.keyCode === 13) {
      this.setState({
        editDescription: false,
      })
    }
  }

  // save data on IPFS & send transaction immediately
  saveData = () => {
    const { web3 } = Web3Store.get()
    this.setState({
      editMode: false,
      claimed: true,
    })
    return new Promise((resolve, reject) => {
      const msgParams = this.makeData()
      this.ipfs.addJSON({ payload: msgParams }, (err, result) => {
        resolve(result)
        const myContract = new web3.eth.Contract(
          this.abi,
          '0xf7d934776da4d1734f36d86002de36954d7dd528',
          {
            from: this.state.account,
          }
        )
        myContract.methods.saveEth(result).send((err, tx) => {
          if (err) {
            return reject(err)
          }
          resolve(tx)
        })
      })
    })
  }

  makeData = () => {
    const msgParams = [
      {
        type: 'string',
        name: 'title',
        value: this.state.titleValue,
      },
      {
        type: 'string',
        name: 'description',
        value: this.state.descriptionValue,
      },
    ]
    return msgParams
  }

  findAddress(address) {
    const bs = `https://ipfs.web3.party:5001/corsproxy?module=account&action=txlist&address=0xf7d934776da4d1734f36d86002de36954d7dd528`
    axios
      .get(bs, {
        headers: {
          Authorization: '',
          'Target-URL': 'https://blockscout.com/eth/ropsten/api',
        },
      })
      .then(response => {
        // handle success
        console.log(response)

        if (response.data && response.data.status === '1') {
          response.data.result.sort(function(a, b) {
            return parseInt(a.nonce) - parseInt(b.nonce)
          })
          let newestHash = ''
          for (let i = 0; i < response.data.result.length; i++) {
            var t = response.data.result[i]
            if (t.contractAddress == '' && t.from == address.toLowerCase()) {
              const decodedData = abiDecoder.decodeMethod(t.input)

              if (decodedData.name == 'saveEth') {
                const hash = decodedData.params.find(element => {
                  return element.name === '_ipfsHash'
                }).value
                newestHash = hash
              }
            }
          }

          this.ipfs.catJSON(newestHash, (err, result) => {
            if (err) {
              console.log(err)
            }
            if (result && result.payload) {
              let arrayToObject = result.payload.reduce((acc, cur) => {
                acc[cur.name] = cur.value
                return acc
              }, {})
              this.setState({ dataloaded: true, ipfsPayload: arrayToObject })
            }
          })
        }
      })
      .catch(function(error) {
        // handle error
        console.log(error)
      })
  }

  async probeEnsDomain(addreth) {
    if (this.validateENSDomain(addreth)) {
      try {
        await Utils.resolveEnsDomain(addreth)
        return true
      } catch (e) {
        console.error(e)
        return false
      }
    }
  }

  async validateAddreth(addreth) {
    const web3 = new Web3()
    const isValid =
      web3.utils.isAddress(addreth) || (await this.probeEnsDomain(addreth))
    this.setState({ isAddrethValid: isValid, isAddrethValidated: true })
  }

  async ensureEthAddress(addreth) {
    if (this.validateENSDomain(addreth)) {
      try {
        let address = await Utils.resolveEnsDomain(addreth)
        Router.push(`/addreth/${address}`)
      } catch (e) {
        console.error(e)
      }
    }
  }

  renderBody() {
    if (!this.state.isAddrethValidated) {
      return <div>Back in the tube and staining...</div>
    } else if (!this.state.isAddrethValid) {
      return <NotAnAddreth />
    } else {
      return (
        <Container>
          <AddrethLink
            href={`https://blockscout.com/eth/mainnet/address/${
              this.props.addreth
            }`}
            target="_blank"
          >
            {this.props.addreth}
          </AddrethLink>
          <DonationForm address={this.props.addreth} donationNetworkID={3} />
          <LeaderboardContainer>
            <Leaderboard address={this.props.addreth} />
          </LeaderboardContainer>
        </Container>
      )
    }
  }

  render() {
    const { addreth } = this.props
    const {
      titleValue,
      descriptionValue,
      editMode,
      ipfsPayload,
      claimed,
    } = this.state

    const { account } = Web3Store.get()

    const isOwner = account === addreth.toLowerCase()

    return (
      <div>
        <Navbar>
          <Link route="/">
            <Brand src="../static/images/brand.svg" />
          </Link>
          <p>{addreth}</p>
          {this.validateENSDomain(addreth) && (
            <>
              <Brand src="../static/images/ens.svg" />
              <p>{addreth}</p>
            </>
          )}
          <Button
            light
            onClick={async () => {
              try {
                const address = await Utils.getMyAddress()
                Router.push(`/address/${address}`)
              } catch (e) {}
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
                  <h1>{titleValue || (ipfsPayload && ipfsPayload.title)}</h1>
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
                isOwner && (
                  <ClaimContainer>
                    <Button
                      light
                      onClick={() => this.setState({ editMode: true })}
                    >
                      {ipfsPayload || claimed ? 'Edit' : 'Claim now!'}
                    </Button>
                  </ClaimContainer>
                )}
            </ContentWrapper>
          </div>
          {this.renderBody()}
        </Container>
      </div>
    )
  }
}
