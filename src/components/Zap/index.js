import { getEventHash, getSignature, nip19, nip57 } from 'nostr-tools'

function setContentForMetadata(userDetails) {
    let content = null
    let lnurl = null
    if (("lud06" in userDetails) && (userDetails.lud06.length > 0)) {
        console.log("it has lud06", userDetails.lud06)
        content = '{"lud06": "' + userDetails.lud06 + '"}';
        lnurl = userDetails.lud06
    } else if (("lud16" in userDetails) && (userDetails.lud16.length > 0)) {
        console.log("it has lud16", userDetails.lud16)
        content = '{"lud16": "' + userDetails.lud16 + '"}'
        let [name, domain] = userDetails.lud16.split('@')
        lnurl = "https://" + domain + "/.well-known/lnurlp/" +name;
    } else {
        console.log("it has nothing")
    }

    return {"content": content, "lnurl": lnurl}
}

const zapRequest = async (postId, recipientPubKey, userDetails) => {
    console.log("post id is ", postId)
    const storedData = localStorage.getItem('memestr')
    if (!storedData) {
        alert("Login required to upvote.")
        return
    }
    let senderPublicKey = JSON.parse(storedData).pubKey
    let staticData = setContentForMetadata(userDetails)
    let lnurl = staticData['lnurl']
    console.log("static data is", staticData)
    const metadata = {
        kind: 0,
        content: staticData['content'],
        pubkey: senderPublicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
    }
    let userPrivateKey = JSON.parse(storedData).privateKey
    let sk = nip19.decode(userPrivateKey)
    metadata.id = getEventHash(metadata)
    metadata.sig = getSignature(metadata, sk.data)
    let callback = await nip57.getZapEndpoint(metadata)
    console.log("callback is ", callback)
    // Create a zap request
    let zapRequestEvent = {
        kind: 9734,
        tags: [
            ['relays', "wss://relay.damus.io"],
            ['amount', "10000"],
            ["lnurl", lnurl],
            ["e", postId], ["p", recipientPubKey]
        ],
        pubkey: senderPublicKey,
        created_at: Math.floor(Date.now() / 1000),
        content: ""
    }
    zapRequestEvent.id = getEventHash(zapRequestEvent)
    zapRequestEvent.sig = getSignature(zapRequestEvent, sk.data)
    let nostrEventForZap = encodeURI(JSON.stringify(zapRequestEvent))
    console.log("encoded uri nostreventzap is", nostrEventForZap)
    const zaprequestUrl = callback + '?amount=10000&nostr=' + nostrEventForZap + '&lnurl=' + lnurl
    let pr = await fetch(zaprequestUrl)
        .then((result) => {
            return result.json();
        })
        .catch((error) => {
            console.log("error is ", error);
            return null;
        });

    const prUrl = 'lightning:' + pr.pr;
    console.log("prurl is ", prUrl)
    return prUrl

}

const  handleZapClick = async (encodedpostId, recipientPubKey, userDetails) => {
    const postId = nip19.decode(encodedpostIds)
    let zapUrl =  await zapRequest(postId, recipientPubKey, userDetails)
    console.log("zapurl is ", zapUrl);// Replace this with your logic to get the URL
    // window.location.assign(zapUrl, '_blank'); // Open the URL in a new tab/window
  }; 

export default handleZapClick;
