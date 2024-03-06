const express = require('express')
const morgan = require('morgan')
const cors = require('cors')

require('dotenv').config()

const app = express()

if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'))
} else {
  app.use(morgan('dev'))
}

const userRouter = require('./routes/user.js')

app.use(
  cors({
    origin: process.env.FRONT_END_DOMAIN,
    credentials: true,
  }),
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/', express.static(__dirname))
// app.use(cookieParser(process.env.COOKIE_SECRET));

// app.use(
//   session({
//     secret: process.env.COOKIE_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     // proxy: process.env.NODE_ENV === "production", // The "X-Forwarded-Proto" header will be used.
//     // cookie: {
//     //   httpOnly: true,
//     //   secure: true,
//     //   domain: process.env.NODE_ENV === "production" && ".houseshop.shop",
//     // },
//   })
// );

app.use('/user', userRouter)

app.use((req, res, next) => {
  const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`)
  error.status = 404
  next(error)
})

app.listen(process.env.PORT || 4050, () => {
  console.log(`${process.env.PORT} 서버 실행 중`)
})
