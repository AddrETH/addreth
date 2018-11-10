import Web3 from 'web3'
import ENS from 'ethjs-ens'
import httpProvider from 'ethjs-provider-http'

import { Store } from 'laco'

export const Web3Store = new Store({
  web3: new Web3(),
  account: '',
  isAvailable: false,
  network: 0,
  ens: new ENS({
    provider: new httpProvider('https://mainnet.infura.io'),
    network: 1,
  }),
})

export const initMetaMask = () => {
  window.addEventListener('load', async () => {
    // Modern dapp browsers...
    if (window.ethereum) {
      const web3 = new Web3(window.ethereum)
      try {
        // Request account access if needed
        await window.ethereum.enable()
        // Acccounts now exposed
        const accounts = await web3.eth.getAccounts()

        if (accounts.length) {
          Web3Store.set(() => ({
            web3,
            isAvailable: true,
            account: accounts[0].toLowerCase(),
          }))
        } else {
          alert("You've locked your MetaMask")
        }

        window.web3.version.getNetwork(
          (err, network) =>
            network !== '1' &&
            alert('Please switch MetaMask network to Mainnet')
        )

        web3.currentProvider.publicConfigStore.on('update', res => {
          Web3Store.set(() => ({
            isAvailable: true,
            account: res.selectedAddress,
            network: res.networkVersion,
          }))
        })
      } catch (error) {
        console.log(error)
        // User denied account access...
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      const web3 = new Web3(web3.currentProvider)

      // Acccounts always exposed
      const accounts = await web3.eth.getAccounts()

      if (accounts.length) {
        Web3Store.set(() => ({
          web3,
          isAvailable: true,
          account: accounts[0].toLowerCase(),
        }))
      } else {
        alert("You've locked your MetaMask")
      }

      window.web3.version.getNetwork((err, network) => {
        network !== '1' && alert('Please switch MetaMask network to Mainnet')
      })

      web3.currentProvider.publicConfigStore.on('update', res => {
        Web3Store.set(() => ({
          isAvailable: true,
          account: res.selectedAddress,
          network: res.networkVersion,
        }))
      })
    }
    // Non-dapp browsers...
    else {
      console.log(
        'Non-Ethereum browser detected. You should consider trying MetaMask!'
      )
    }
  })
}

export const ensLookup = async domain => {
  const { ens } = Web3Store.get()
  return await ens.lookup(domain)
}
