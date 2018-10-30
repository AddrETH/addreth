import React, { PureComponent } from 'react'
import styled from 'styled-components'

import Button from '../components/Button'

import { Web3Store } from '../stores/web3'

const Container = styled.div`
  display: grid;
  color: white;
  grid-template-columns: (auto-fill, 1fr);
`

const TransactionContainer = styled.div`
  align-content: center;
`

const TransactionForm = styled.form`
  display: grid;
  grid-template-rows: auto auto;
  grid-gap: 0.7rem;
  padding: 1rem;
`

const Input = styled.input`
  border-radius: 0.2rem;
  padding: 0.3rem;
`

const Thanks = styled.span`
  margin: 0 auto;
  text-align: center;
  font-size: 3rem;
  grid-row: 1 / span 2;
  color: #03dac6;
`

export default class DonationForm extends PureComponent {
  constructor(props) {
    super()
    this.state = {
      netId: 0,
      thanks: false,
    }
  }

  handleDonate = event => {
    event.preventDefault()
    const form = event.target
    const { web3, account } = Web3Store.get()
    let donateWei = new web3.utils.BN(
      web3.utils.toWei(form.elements['amount'].value, 'ether')
    )
    let message = web3.utils.toHex(form.elements['message'].value)
    let extraGasNeeded = form.elements['message'].value.length * 68
    if (this.state.netId === this.props.donationNetworkID) {
      return web3.eth
        .sendTransaction(
          {
            from: account,
            to: this.props.address,
            value: donateWei,
            gas: 150000 + extraGasNeeded,
            data: message,
          },
          (err, hash) => {
            //debugger;
            console.log('tx hash', hash)
            form.elements['message'].value = ''
            form.elements['amount'].value = ''
            this.setState({
              thanks: true,
              donateEnabled: true,
            })
          }
        )
        .catch(e => {
          console.log(e)
        })
    } else {
      console.log('no donation allowed on this network')
      this.setState({
        thanks: true,
        donateEnabled: false,
      })
    }
  }

  render() {
    const candonate = true
    return (
      <Container>
        {/* <img src="/img/ways-to-donate.svg" className="typelogo img-fluid" /> */}
        {candonate ? (
          <TransactionContainer>
            <TransactionForm onSubmit={this.handleDonate}>
              <Input type="text" placeholder="ETH to send" name="amount" />
              <Input type="text" placeholder="message" name="message" />
              <Button primary>Send</Button>
            </TransactionForm>
          </TransactionContainer>
        ) : (
          <br />
        )}
        {/* <img src="/img/placeholder-qr.svg" className="qr-code" /> */}
        {this.state.thanks && <div>WELL THANKS BUDDY</div>}
      </Container>
    )
  }
}
