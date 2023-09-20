
# TL;DR

When a connection is established between an issuer and holder via a mediator there is a period when the connection is in state `"rfc23_state": "response-sent"` and  `"rfc23_state": "completed",` when a message, such an an offer, can be sent by the issuer to the holder. If this happens the offer is queued in the (ACA-py) mediator and no re-delivery attempt is made.

# Description

There appears to be a condition where, after running for some time, an ACA-py mediator can enter a state where:

 When a connection is established between an issuer and holder via a mediator there is a period when the connection is in state `"rfc23_state": "response-sent"` and  `"rfc23_state": "completed",` when a message, such an an offer, can be sent by the issuer to the holder. If this happens the offer is queued in the mediator and no re-delivery attempt is made.

 This appears to be a race condition where the mediator performance slows just enough (on cloud infrastructure) to allow the above mentiond scenario to surface. It can be reproduced using a local mediator by, as the description notes, sending an offer quickly befor a connection reaches the "completed" state.

### References

- [RFC 0005 - DID Communication](https://github.com/hyperledger/aries-rfcs/blob/main/concepts/0005-didcomm/README.md)
- [RFC 0046 - Mediators](https://github.com/hyperledger/aries-rfcs/tree/main/concepts/0046-mediators-and-relays)
- [RFC 0060 - Conneciton](https://github.com/hyperledger/aries-rfcs/blob/main/features/0160-connection-protocol/README.md)
- [ACA-py Issue 21110](https://github.com/hyperledger/aries-cloudagent-python/issues/21110)
- [AFJ issue 1262](https://github.com/hyperledger/aries-framework-javascript/issues/1262)


### Demonstration

In [this](./faber-local-ok.mov) video I use a similar script to the one attached to demostrate that waiting for the conneciton to be "complete" as shown by the two messages in the Faber terminal will create a successful offer in the script shown in VSCode (on the right)

In [this](./faber-local-fail.mov) video I use a similar script to the one attached to demostrate that sending an offer when the conneciton is in "request-sent", before it reaces a completed state, causes the offer to now show up in the script shown in VSCode (on the right)

# Steps to Reproduce

### Setup

 1. Start an [ACA-py mediator](https://github.com/hyperledger/aries-mediator-service) locally or otherwise;
 2. Start the [ACA-py Faber](https://github.com/hyperledger/aries-cloudagent-python);
 3. Start either the sample script or a fresh install of the BC Wallet.

If you are using the sample script it will run an mediated agent that does approximaly the same process as the Bifold / BC Wallet. Use a similar command with a proper invitaiton URL. If you are not setup to run AFJ or TypeScript use the included **.devcontainer** in VSCode.

```console
rm -rf ~/.indy_client/ && ./node_modules/.bin/ts-node test.ts -i https://my.invitation.com?c_i=abc123
```

### Trigger the Issue

1. Using a **fresh install** of the BC Wallet scan Faber's invitation QR code;
2. As soon as the Faber UI displays the first connection message, show below,
press #1 to offer a credential.

```JSON
{
    "their_label": "BC Wallet",
    "connection_protocol": "connections/1.0",
    "updated_at": "2023-02-02T20:17:34.320044Z",
    "my_did": "KPZpDbMPDXZYVZEKRttanB",
    "connection_id": "b58b186b-d4ac-439c-9eb4-93ed38ba6eef",
    "rfc23_state": "response-sent",
    "invitation_key": "EAUsTQpExyNa7LpwQtDgdxbbWASA4ubMBhAGeGbV1uzX",
    "routing_state": "none",
    "invitation_mode": "once",
    "accept": "auto",
    "their_role": "invitee",
    "created_at": "2023-02-02T20:13:32.734545Z",
    "their_did": "4AM74FNHKm3RCHq327rMnt",
    "state": "response"
}
```
3. The offer will be sent over the conneciton before it is fully setup resulting
in the message being queued on on the mediator.
4. The following message will then be displayed in Faber indicating the connection
is fully setup:

```JSON
{
    "their_label": "BC Wallet",
    "connection_protocol": "connections/1.0",
    "updated_at": "2023-02-02T20:17:37.660641Z",
    "my_did": "KPZpDbMPDXZYVZEKRttanB",
    "connection_id": "b58b186b-d4ac-439c-9eb4-93ed38ba6eef",
    "rfc23_state": "completed",
    "invitation_key": "EAUsTQpExyNa7LpwQtDgdxbbWASA4ubMBhAGeGbV1uzX",
    "routing_state": "none",
    "invitation_mode": "once",
    "accept": "auto",
    "their_role": "invitee",
    "created_at": "2023-02-02T20:13:32.734545Z",
    "their_did": "4AM74FNHKm3RCHq327rMnt",
    "state": "response"
}
```

4. At this point nothing will show up in the wallet. Returning to the home screen 
will display no notifications (offers). 

### Same Senario, No Issue

1. Using a **fresh install** of the BC Wallet scan Faber's invitation QR code;
2. You will see a message similar to the following in the Faber UI, **do nothing**:

```JSON
{
    "their_label": "BC Wallet",
    "connection_protocol": "connections/1.0",
    "updated_at": "2023-02-02T20:17:34.320044Z",
    "my_did": "KPZpDbMPDXZYVZEKRttanB",
    "connection_id": "b58b186b-d4ac-439c-9eb4-93ed38ba6eef",
    "rfc23_state": "response-sent",
    "invitation_key": "EAUsTQpExyNa7LpwQtDgdxbbWASA4ubMBhAGeGbV1uzX",
    "routing_state": "none",
    "invitation_mode": "once",
    "accept": "auto",
    "their_role": "invitee",
    "created_at": "2023-02-02T20:13:32.734545Z",
    "their_did": "4AM74FNHKm3RCHq327rMnt",
    "state": "response"
}
```
3. Wait for the following messge to be displayed in the Faber UI:

```JSON
{
    "their_label": "BC Wallet",
    "connection_protocol": "connections/1.0",
    "updated_at": "2023-02-02T20:17:37.660641Z",
    "my_did": "KPZpDbMPDXZYVZEKRttanB",
    "connection_id": "b58b186b-d4ac-439c-9eb4-93ed38ba6eef",
    "rfc23_state": "completed",
    "invitation_key": "EAUsTQpExyNa7LpwQtDgdxbbWASA4ubMBhAGeGbV1uzX",
    "routing_state": "none",
    "invitation_mode": "once",
    "accept": "auto",
    "their_role": "invitee",
    "created_at": "2023-02-02T20:13:32.734545Z",
    "their_did": "4AM74FNHKm3RCHq327rMnt",
    "state": "response"
}
```

4. Once this message is displayed, press #1 to offer a credential.
5. At this point the offer will show up in the wallet. Returning to the home screen 
will display the notification (offer). 

### Expected Behaviour

[RFC 0160](https://github.com/hyperledger/aries-rfcs/blob/main/features/0160-connection-protocol/README.md) does not require a acknowlwdgement that a connection is completed before message can be sent over it. This is address in V2. 

An ACA-py mediator should atempt delivery of any queued messages when the related connection becomes "completed" to remediate this issue.

### Q & A

1. How do you know the message is queued in the mediator?

In AFJ the fn `initiateMessagePickup` can be called to trigger the delivery of messages. The outstanding offer will be delivered. 

2. Is this infrastructure (OpenShift, Cloud, Kubernets) related?

This problem exists on two mediators running similar version of ACA-py hosted on different infrastructure by two different companies. It can also be reproduced locally using Docker.

3. Is this specific to a version of ACA-py. 

It can be reproduced locally in Dokcer using ACA-py 0.7.3 and 1.0.0-rc1. The cloud hosted agents both run ACA-py 0.7.x versions.

4. Why do you think its a race condition?

In one test we used an ACA-py 0.7.3 mediator on a cloud platform which had been running for 1 day under light load. The problem was evident. On the same cloud platform an ACA-py mediator running 0.7.4-rc2 which had been running for <10 min. The problem did not present. This leands us to believe that as a mediator is used performance degrades enough for the problem to present.

5. Could this be the issuer rather than the mediator?

Unlikley. The situation can be reproduced using the [BC Showcase](https://digital.gov.bc.ca/digital-trust/showcase/) demo. By using the older mediator mentiond in #4 above the automated showcase demo fails. By using the fresh mediator from #4 above the demo succeeds.

6. What conneciotn protocol is being used?

V1. 

7. Is this a bug?

Maybe. [RFC 0160](https://github.com/hyperledger/aries-rfcs/blob/main/features/0160-connection-protocol/README.md) does **not** require acknowledgement when a conneciton enters the "completed" state. Its is by convention that a controller should confirm the state before sending a message (offer) over the conneciton. This is a recongized shortcoming that shoudl be addressed in [V2](https://identity.foundation/didcomm-messaging/spec/).

However, it may be a bug in that an ACA-py mediator does not atempt re-delivery of queued messages if that message comes in before the conneciton is "completed". 
