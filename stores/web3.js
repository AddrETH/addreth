import Web3 from 'web3'
import { Store } from 'laco'

export const Web3Store = new Store({
  web3: new Web3(),
  account: '',
  isAvailable: false,
  network: 0,
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

        if (accounts[0]) {
          Web3Store.set(() => ({
            web3,
            isAvailable: true,
            account: accounts[0],
          }))
        }

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

      if (accounts[0]) {
        Web3Store.set(() => ({
          web3,
          isAvailable: true,
          account: accounts[0],
        }))
      }

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
