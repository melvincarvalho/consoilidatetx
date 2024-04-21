#!/usr/bin/env node

import { Address, Signer, Tx } from '@cmdcode/tapscript'

function detectVinCount(args) {
  let vinCount = 0
  let i = 0

  while (i < args.length) {
    console.log(args)
    console.log(args[i + 3])
    if (args[i + 1] !== undefined && args[i + 1].length > 30 && args[i + 3] !== undefined && parseInt(args[i + 3]) < 1000000) {
      vinCount++
      i += 5
    } else {
      break
    }
  }

  return vinCount
}

// calculate number of inputs
const args = process.argv.slice(2)
const vinCount = detectVinCount(args)
console.error('Number of vin:', vinCount)

// calculate number of outputs
const vouts = process.argv.slice(2 + 5 * vinCount)
const voutCount = vouts.length / 2
console.error('Number of vout:', voutCount)

// Transaction fee (in satoshis, for example).
const fee = 20000

// parse inputs
const inPrivkey = []
const inPubkey = []
const inTxid = []
const inVout = []
const inAmount = []
const vinObj = []

for (let i = 0; i < vinCount; i++) {
  inPrivkey[i] = process.argv[2 + (i * 5)] || '5f49bb8ae1649065012ba6aa02fb3ad86af35ac6fa5c9f99704944877abd8517'
  inPubkey[i] = process.argv[3 + (i * 5)] || '5f49bb8ae1649065012ba6aa02fb3ad86af35ac6fa5c9f99704944877abd8517'
  inTxid[i] = process.argv[4 + (i * 5)] || '5f49bb8ae1649065012ba6aa02fb3ad86af35ac6fa5c9f99704944877abd8517'
  inVout[i] = parseInt(process.argv[5 + (i * 5)]) || 0
  inAmount[i] = parseInt(process.argv[6 + (i * 5)]) || 1000000
  vinObj.push(
    {
      // The txid of your funding transaction.
      txid: inTxid[i],
      // The index of the output you are spending.
      // vout: parseInt(process.argv[5]) || 31
      vout: inVout[i],
      // For Taproot, we need to specify this data when signing.
      prevout: {
        // The value of the output we are spending.
        value: inAmount[i],
        // This is the script that our taproot address decodes into.
        scriptPubKey: ['OP_1', inPubkey[i]]
      }
    }
  )
}
console.error('vinObj', vinObj)

// parse outputs
const outAddress = []
const outAmount = []
console.error(vinObj[0].inPubkey)
const address = Address.p2tr.encode(inPubkey[0], 'mainnet')
const voutobj = []

for (let i = 0; i < voutCount; i++) {
  outAddress[i] = process.argv[2 + (5 * vinCount) + (i * 2)] || '5f49bb8ae1649065012ba6aa02fb3ad86af35ac6fa5c9f99704944877abd8517'
  outAmount[i] = parseInt(process.argv[2 + (5 * vinCount) + (i * 2) + 1])
  voutobj.push({
    value: outAmount[i],
    scriptPubKey: ['OP_1', outAddress[i]]
  })
}

// build tx

// For key-spends, we need to tweak both the secret key and public key.
// const [tseckey] = Tap.getSecKey(seckey)
// const [tpubkey] = Tap.getPubKey(pubkey)

const txdata = Tx.create({
  vin: vinObj,
  vout: voutobj
})

console.error(JSON.stringify(txdata, null, 2))

// For this example, we are signing for input 0.

// sign tx
for (let i = 0; i < vinCount; i++) {
  const sig = Signer.taproot.sign(inPrivkey[i], txdata, i)
  txdata.vin[i].witness = [sig]
}

// For verification, provided your
// await Signer.taproot.verify(txdata, 0, { throws: true })

console.error('Your address:', address)
console.error('Your txhex:')

// tx to stdout
console.log(Tx.encode(txdata).hex)
