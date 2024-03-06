const express = require('express')
const router = express.Router()

require('dotenv').config()
const OpenAI = require('openai')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// 스레드 생성하기
router.post('/thread', async (req, res, next) => {
  const thread = await openai.beta.threads.create()

  return res.status(201).json({ thread_id: thread.id })
})

// 메시지 보내고 받아오기
router.post('/thread/message', async (req, res, next) => {
  //
  const threadId = req.body.threadId
  const userQuestion = req.body.question

  // Pass in the user question into the existing thread
  await openai.beta.threads.messages.create(threadId, {
    role: 'user',
    content: userQuestion,
  })

  // Use runs to wait for the assistant response and then retrieve it
  const run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: process.env.ASSISTANT_ID,
  })

  let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id)

  // Polling mechanism to see if runStatus is completed
  // This should be made more robust.
  while (runStatus.status !== 'completed') {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id)
  }

  // Get the last assistant message from the messages array
  const messages = await openai.beta.threads.messages.list(threadId)

  // Find the last message for the current run
  // 어시스턴트가 보낸 메시지 중 가장 최근의 메시지를 찾는다.
  const lastMessageForRun = messages.data
    .filter(
      (message) => message.run_id === run.id && message.role === 'assistant',
    )
    .pop()

  return res
    .status(201)
    .json({ message: lastMessageForRun.content[0].text.value })
})

module.exports = router
