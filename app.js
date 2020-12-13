const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const hbs = require('express-handlebars');
const fileUpload = require('express-fileupload');
const usersRouter = require('./routes/users');
const adminRouter = require('./routes/admin');
const cors = require('cors')
const app = express();
const secret = require('./config/secret')

app.use(cors({
  "origin": "*",
  "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
  "preflightContinue": false,
  "optionsSuccessStatus": 204
}))
var request = require('request');

var CLIENT = secret.paypalClient
var SECRET = secret.paypalSecret
var PAYPAL_API = 'https://api-m.sandbox.paypal.com';
const db = require('./config/connection');
// view engine setup
app.set('etag', false);
app.use((req, res, next) => { 
  res.set('Cache-Control', 'no-store');
  next();
});
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine('hbs', hbs({
  extname: 'hbs', defaultLayout: 'layout', layoutDir: `${__dirname}/views/layout`, partialsDir: `${__dirname}/views/partial`,
}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
db.connect((err) => {
  if (err) console.log('have errr');
  else console.log('database connected sucessfully');
});
app.use(fileUpload());

app.use('/', usersRouter);
app.use('/admin', adminRouter);

app.post('/my-api/create-payment/:rate', (req, res) => {
var total  = req.params.rate
  request.post(PAYPAL_API + '/v1/payments/payment',
  {
    auth:
    {
      user: CLIENT,
      pass: SECRET
    },
    body:
    {
      intent: 'sale',
      payer:
      {
        payment_method: 'paypal'
      },
      transactions: [
      {
        amount:
        {
          total: total,  //amount frontend
          currency: 'USD'
        }
      }],
      redirect_urls:
      {
        return_url: '/orderPlaced',
        cancel_url: 'https://example.com'
      }
    },
    json: true
  }, (err, response) => {
      if (err)
      {
        console.error(err);
        return res.sendStatus(500);
      }
      // 3. Return the payment ID to the client
      res.json(
      {
        id: response.body.id
      });
    });
  
})

app.post('/my-api/execute-payment/', (req, res) => {
  var paymentID = req.body.paymentID;
  var payerID = req.body.payerID;
  request.post(PAYPAL_API + '/v1/payments/payment/' + paymentID + '/execute',
    {
      auth:
      {
        user: CLIENT,
        pass: SECRET
      },
      body:
      {
        payer_id: payerID,
        transactions: [
        {
          amount:
          {
            total: '10.99',
            currency: 'USD'
          }
        }]
      },
      json: true
    },
    (err, response) => {
      if (err)
      {
        console.error(err);
        res.send(response)
        return res.sendStatus(500);
      }
      //add to database success result
      
      res.json(
      {
        status: 'success'
      });
    });
    
})
// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message; 
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
app.listen(8000)
module.exports = app;
