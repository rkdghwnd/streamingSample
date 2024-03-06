import './App.css'

import { useEffect } from 'react'
import { useRef } from 'react'
import { useState } from 'react'

function App() {
  const [inputValue, setInputValue] = useState('')

  const peerConnection = useRef(null)
  const sessionId = useRef(null)
  const sessionClientAnswer = useRef(null)
  const statsIntervalId = useRef(null)
  const videoIsPlaying = useRef(null)
  const lastBytesReceived = useRef(null)
  const streamId = useRef(null)

  const talkVideoRef = useRef(null)
  const peerStatusLabelRef = useRef(null)
  const iceStatusLabelRef = useRef(null)
  const iceGatheringStatusLabelRef = useRef(null)
  const signalingStatusLabelRef = useRef(null)
  const streamingStatusLabelRef = useRef(null)
  const userInputRef = useRef(null)

  useEffect(() => {
    if (talkVideoRef.current) {
      talkVideoRef.current.setAttribute('playinline', '')
    }
  }, [talkVideoRef.current])

  const RTCPeerConnection = (
    window.RTCPeerConnection ||
    window.webkitRTCPeerConnection ||
    window.mozRTCPeerConnection
  ).bind(window)

  async function fetchOpenAIResponse(userMessage) {
    // const response = await fetch('https://api.openai.com/v1/chat/completions', {
    //   method: 'POST',
    //   headers: {
    //     Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     model: 'gpt-3.5-turbo',
    //     messages: [{ role: 'user', content: userMessage }],
    //     temperature: 0.7,
    //     max_tokens: 25,
    //   }),
    // })
    // if (!response.ok) {
    //   throw new Error(
    //     `OpenAI API request failed with status ${response.status}`,
    //   )
    // }
    // const data = await response.json()
    // return data.choices[0].message.content.trim()
    // api 요청 보내기(메세지 전송 및 답변 받아오기)
  }

  const onClickConnectButton = async () => {
    if (
      peerConnection.current &&
      peerConnection.current.connectionState === 'connected'
    ) {
      return
    }

    stopAllStreams()
    closePC()

    const sessionResponse = await fetch(
      `${import.meta.env.VITE_DID_URL}/talks/streams`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${import.meta.env.VITE_DID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // source_url: "https://raw.githubusercontent.com/jjmlovesgit/D-id_Streaming_Chatgpt/main/oracle_pic.jpg",
          source_url:
            'https://velog.velcdn.com/images/rkdghwnd/post/996d6bd8-316d-4864-8623-be3ce43ab58a/image.PNG',
        }),
      },
    )

    const {
      id: newStreamId,
      offer,
      ice_servers: iceServers,
      session_id: newSessionId,
    } = await sessionResponse.json()

    streamId.current = newStreamId
    sessionId.current = newSessionId

    let newSessionClientAnswerawait
    try {
      newSessionClientAnswerawait = await createPeerConnection(
        offer,
        iceServers,
      )
      // setSessionClientAnswer(newSessionClientAnswerawait)
      sessionClientAnswer.current = newSessionClientAnswerawait

      await new Promise((resolve) => setTimeout(resolve, 2000))
    } catch (e) {
      console.log('error during streaming setup', e)
      stopAllStreams()
      closePC()
      return
    }

    const sdpResponse = await fetch(
      `${import.meta.env.VITE_DID_URL}/talks/streams/${encodeURIComponent(
        newStreamId,
      )}/sdp`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${import.meta.env.VITE_DID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answer: newSessionClientAnswerawait,
          session_id: newSessionId,
        }),
      },
    )

    // thread 만들기
    const createThreadResponse = await fetch(
      `${import.meta.env.VITE_BACK_URL}/user/thread`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    ).then((res) => res.json())

    window.localStorage.setItem('thread_id', createThreadResponse.thread_id)
  }

  const onClickStartButton = async () => {
    if (
      peerConnection?.current?.signalingState === 'stable' ||
      peerConnection?.current?.iceConnectionState === 'connected'
    ) {
      // New from Jim 10/23 -- Get the user input from the text input field get ChatGPT Response
      // const responseFromOpenAI = await fetchOpenAIResponse(inputValue)

      // Print the openAIResponse to the console
      // console.log('OpenAI Response:', responseFromOpenAI)

      // assistants 메시지 보내기

      const sendMessageResponse = await fetch(
        `${import.meta.env.VITE_BACK_URL}/user/thread/message`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            threadId: window.localStorage.getItem('thread_id'),
            question: inputValue,
          }),
        },
      ).then((res) => res.json())

      console.log('OpenAI Response:', sendMessageResponse)

      const talkResponse = await fetch(
        `${import.meta.env.VITE_DID_URL}/talks/streams/${streamId.current}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${import.meta.env.VITE_DID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            script: {
              type: 'text',
              subtitles: 'false',
              provider: {
                type: 'microsoft',
                voice_id: 'en-US-ChristopherNeural',
              },
              ssml: false,
              input: sendMessageResponse.message, //send the openAIResponse to D-id
            },
            config: {
              fluent: true,
              pad_audio: 0,
              driver_expressions: {
                expressions: [
                  { expression: 'neutral', start_frame: 0, intensity: 0 },
                ],
                transition_frames: 0,
              },
              align_driver: true,
              align_expand_factor: 0,
              auto_match: true,
              motion_factor: 0,
              normalization_factor: 0,
              sharpen: true,
              stitch: true,
              result_format: 'mp4',
            },
            driver_url: 'bank://lively/',
            config: {
              stitch: true,
            },
            session_id: sessionId.current,
          }),
        },
      )
    }
  }

  const onClickDeleteButton = async () => {
    await fetch(
      `${import.meta.env.VITE_DID_URL}/talks/streams/${streamId.current}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${import.meta.env.VITE_DID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId.current }),
      },
    )

    stopAllStreams()
    closePC()
  }

  function onIceGatheringStateChange() {
    iceGatheringStatusLabelRef.current.innerText =
      peerConnection.current.iceGatheringState
    iceGatheringStatusLabelRef.current.className =
      'iceGatheringState-' + peerConnection.current.iceGatheringState
  }

  onIceCandidate()

  async function onIceCandidate(event) {
    // console.log('onIceCandidate', event)
    if (event?.candidate) {
      const { candidate, sdpMid, sdpMLineIndex } = event.candidate
      await new Promise((resolve) => setTimeout(resolve, 2000))
      fetch(
        `${import.meta.env.VITE_DID_URL}/talks/streams/${streamId.current}/ice`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${import.meta.env.VITE_DID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            candidate,
            sdpMid,
            sdpMLineIndex,
            session_id: sessionId.current,
          }),
        },
      )
    }
  }
  function onIceConnectionStateChange() {
    iceStatusLabelRef.current.innerText =
      peerConnection?.current?.iceConnectionState
    iceStatusLabelRef.current.className =
      'iceConnectionState-' + peerConnection?.current?.iceConnectionState
    if (
      peerConnection?.current?.iceConnectionState === 'failed' ||
      peerConnection?.current?.iceConnectionState === 'closed'
    ) {
      stopAllStreams()
      closePC()
    }
  }
  function onConnectionStateChange() {
    // not supported in firefox
    peerStatusLabelRef.current.innerText =
      peerConnection?.current?.connectionState
    peerStatusLabelRef.current.className =
      'peerConnectionState-' + peerConnection?.current?.connectionState
  }
  function onSignalingStateChange() {
    signalingStatusLabelRef.current.innerText =
      peerConnection?.current?.signalingState
    signalingStatusLabelRef.current.className =
      'signalingState-' + peerConnection?.current?.signalingState
  }

  function onVideoStatusChange(videoIsPlaying, stream) {
    let status
    if (videoIsPlaying) {
      status = 'streaming'
      const remoteStream = stream
      setVideoElement(remoteStream)
    } else {
      status = 'empty'
      playIdleVideo()
    }
    streamingStatusLabelRef.current.innerText = status
    streamingStatusLabelRef.current.className = 'streamingState-' + status
  }

  function onTrack(event) {
    /**
     * The following code is designed to provide information about wether currently there is data
     * that's being streamed - It does so by periodically looking for changes in total stream data size
     *
     * This information in our case is used in order to show idle video while no talk is streaming.
     * To create this idle video use the POST https://api.d-id.com/talks endpoint with a silent audio file or a text script with only ssml breaks
     * https://docs.aws.amazon.com/polly/latest/dg/supportedtags.html#break-tag
     * for seamless results use `config.fluent: true` and provide the same configuration as the streaming video
     */

    if (!event.track) return

    statsIntervalId.current = setInterval(async () => {
      const stats = await peerConnection.current.getStats(event.track)
      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
          const videoStatusChanged =
            videoIsPlaying.current !==
            report.bytesReceived > lastBytesReceived.current

          if (videoStatusChanged) {
            videoIsPlaying.current =
              report.bytesReceived > lastBytesReceived.current
            onVideoStatusChange(videoIsPlaying.current, event.streams[0])
          }
          lastBytesReceived.current = report.bytesReceived
        }
      })
    }, 500)
  }

  async function createPeerConnection(offer, iceServers) {
    let newPeerConnection = peerConnection.current
    if (!peerConnection.current) {
      newPeerConnection = new RTCPeerConnection({ iceServers })
      peerConnection.current = newPeerConnection

      newPeerConnection.addEventListener(
        'icegatheringstatechange',
        onIceGatheringStateChange,
        true,
      )
      newPeerConnection.addEventListener('icecandidate', onIceCandidate, true)
      newPeerConnection.addEventListener(
        'iceconnectionstatechange',
        onIceConnectionStateChange,
        true,
      )
      newPeerConnection.addEventListener(
        'connectionstatechange',
        onConnectionStateChange,
        true,
      )
      newPeerConnection.addEventListener(
        'signalingstatechange',
        onSignalingStateChange,
        true,
      )
      newPeerConnection.addEventListener('track', onTrack, true)
    }

    await newPeerConnection.setRemoteDescription(offer)
    console.log('set remote sdp OK')

    const sessionClientAnswer = await newPeerConnection.createAnswer()
    console.log('create local sdp OK')

    await newPeerConnection.setLocalDescription(sessionClientAnswer)
    console.log('set local sdp OK')

    return sessionClientAnswer
  }

  function setVideoElement(stream) {
    if (!stream) return
    talkVideoRef.current.srcObject = stream
    talkVideoRef.current.loop = false

    // safari hotfix
    if (talkVideoRef.current.paused) {
      talkVideoRef.current
        .play()
        .then((_) => {})
        .catch((e) => {})
    }
  }

  function playIdleVideo() {
    talkVideoRef.current.srcObject = undefined
    // talkVideo.src = 'oracle_Idle.mp4';
    talkVideoRef.current.src = '/jejus_idle.mp4'
    talkVideoRef.current.loop = true
  }

  function stopAllStreams() {
    if (talkVideoRef.current.srcObject) {
      console.log('stopping video streams')
      talkVideoRef.current.srcObject
        .getTracks()
        .forEach((track) => track.stop())
      talkVideoRef.current.srcObject = null
    }
  }

  function closePC(pc = peerConnection.current) {
    if (!pc) return
    console.log('stopping peer connection')
    pc.close()
    console.log(pc.icegatheringstatechange)
    pc.removeEventListener(
      'icegatheringstatechange',
      onIceGatheringStateChange,
      true,
    )
    pc.removeEventListener('icecandidate', onIceCandidate, true)
    pc.removeEventListener(
      'iceconnectionstatechange',
      onIceConnectionStateChange,
      true,
    )
    pc.removeEventListener(
      'connectionstatechange',
      onConnectionStateChange,
      true,
    )
    pc.removeEventListener('signalingstatechange', onSignalingStateChange, true)
    pc.removeEventListener('track', onTrack, true)
    clearInterval(statsIntervalId.current)
    iceGatheringStatusLabelRef.current.innerText = ''
    signalingStatusLabelRef.current.innerText = ''
    iceStatusLabelRef.current.innerText = ''
    peerStatusLabelRef.current.innerText = ''
    console.log('stopped peer connection')
    if (pc === peerConnection.current) {
      peerConnection.current = null
    }
  }

  const maxRetryCount = 3
  const maxDelaySec = 4
  // Default of 1 moved to 5
  async function fetchWithRetries(url, options, retries = 3) {
    try {
      return await fetch(url, options)
    } catch (err) {
      if (retries <= maxRetryCount) {
        const delay =
          Math.min(Math.pow(2, retries) / 4 + Math.random(), maxDelaySec) * 1000

        await new Promise((resolve) => setTimeout(resolve, delay))

        console.log(
          `Request failed, retrying ${retries}/${maxRetryCount}. Error ${err}`,
        )
        return fetchWithRetries(url, options, retries + 1)
      } else {
        throw new Error(`Max retries exceeded. error: ${err}`)
      }
    }
  }

  return (
    <>
      {/* <!-- adde "id=content" --> */}
      <div id="content">
        {/* <!-- added "id=video-wrapper" --> */}
        <div id="video-wrapper">
          <div>
            <video
              id="talk-video"
              width="400"
              height="400"
              autoPlay
              ref={talkVideoRef}
            ></video>
          </div>
        </div>
        <br />
        <div id="input-container">
          <input
            type="text"
            id="user-input-field"
            placeholder="I am your ChatGPT Live Agent..."
            ref={userInputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.currentTarget.value)}
          />
          <hr />
          {/* <!-- Add a horizontal rule --> */}
        </div>
        {/* <!-- added div#buttons --> */}
        <div id="buttons">
          <button
            id="connect-button"
            type="button"
            onClick={onClickConnectButton}
          >
            Connect
          </button>
          <button id="talk-button" type="button" onClick={onClickStartButton}>
            Start
          </button>
          <button
            id="destroy-button"
            type="button"
            onClick={onClickDeleteButton}
          >
            Destroy
          </button>
        </div>

        {/* <!-- added div#status --> */}
        <div id="status">
          {/* <!-- removed the wrapping <div> tags --> */}
          {'ICE gathering status:'}{' '}
          <label
            id="ice-gathering-status-label"
            ref={iceGatheringStatusLabelRef}
          ></label>
          <br />
          {'ICE status:'}{' '}
          <label id="ice-status-label" ref={iceStatusLabelRef}></label>
          <br />
          {'Peer connection status:'}{' '}
          <label id="peer-status-label" ref={peerStatusLabelRef}></label>
          <br />
          {'Signaling status:'}{' '}
          <label
            id="signaling-status-label"
            ref={signalingStatusLabelRef}
          ></label>
          <br />
          {'Streaming status:'}{' '}
          <label
            id="streaming-status-label"
            ref={streamingStatusLabelRef}
          ></label>
          <br />
        </div>
      </div>
    </>
  )
}

export default App
