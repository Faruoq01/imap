const Imap = require('imap');
const {simpleParser} = require('mailparser');
const inspect = require('util').inspect;
const fs = require('fs');
const express = require('express');
const Captcha = require('2captcha');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());

app.get('/email-captcha', (req, res) => {
    const registration = async () => {
        const solver = new Captcha.Solver('bf7113426044391b0c199943365e3150');
        console.log('Solving email captcha ...Captcha');
        //'https://secure.indeed.com/auth?hl=en&continue=%2Fsettings%2Faccount'
        const { data } = await solver.hcaptcha('7734ec9b-f8cb-44b2-9fac-3a502cb4f1bf', 'https://secure.indeed.com/auth?hl=en&continue=%2Fsettings%2Faccount');   
        //console.log(data);
        return res.json({token: data});
    }
    try{
        registration();
    }catch(e){
        res.json(e);
    }
});

app.get('/password-captcha', (req, res) => {
    const registration = async () => {
        const solver = new Captcha.Solver('bf7113426044391b0c199943365e3150');
        console.log('Solving password captcha ...Captcha');
        //'https://secure.indeed.com/auth?hl=en&continue=%2Fsettings%2Faccount'
        const { data } = await solver.hcaptcha('7734ec9b-f8cb-44b2-9fac-3a502cb4f1bf', 'https://secure.indeed.com/auth');   
        //console.log(data);
        return res.json({token: data});
    }
    try{
        registration();
    }catch(e){
        res.json(e);
    }
});

app.get('/code/:user/:password', (req, res) => {
    const {user, password} = req.params;
    const fetchEmail = async () => {
        var imap = new Imap({
            user: user,
            password: password,
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false }
        });
        
        function openInbox(cb) {
            imap.openBox('INBOX', true, cb);
        }

        const result = [];

        const showResult = () => {
            const indeed = [];
            if(result.length > 0){
                for(let subject of result){
                    if(subject.includes('Indeed verification code')){
                        indeed.push(subject);
                    }
                }
            }
            return indeed;
        }
          
        imap.once('ready', function() {
            openInbox(function(err, box) {
                if (err) throw err;
                // Change the date with the one from which you want receive emails
                //Unseen means you'll only get mails that are unseen
                imap.search([ 'UNSEEN', ['SINCE', 'April 14, 2022'] ], function(err, results) { 
                if (err) throw err;
                    var f = imap.fetch(results, { bodies: '' });
                    f.on('message', function(msg, seqno) {
                        //console.log('Message #%d', seqno); 
                        var prefix = '(#' + seqno + ') ';
                        msg.on('body', function(stream, info) {
                            console.log(prefix + 'Body');
                            //stream.pipe(fs.createWriteStream('msg-' + seqno + '-body.txt'));
                            simpleParser(stream, async(error, parsed) => {
                                const {from, subject, textAsHtml, text} = parsed;
                                result.push(subject);
                            });
                        });
                        msg.once('attributes', function(attrs) {
                            console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
                        });
                        msg.once('end', function() {
                            console.log(prefix + 'Finished');
                        });
                    });
                    f.once('error', function(err) {
                        console.log('Fetch error: ' + err);
                    });
                    f.once('end', function() {
                        console.log('Done fetching all messages!');
                        imap.end();
                    });
                });
            });
        });
          
        imap.once('error', function(err) {
            console.log(err);
        });
          
        imap.once('end', function() {
            console.log('Connection ended');
            const response = showResult();
            res.json({code: response.pop().split(' ')[0]});
        });
          
        imap.connect(); 

    }

    try{
        fetchEmail();
    }catch(e){
        res.json(e);
    }
});

app.listen(PORT, () => {
    console.log('listening on port: '+ PORT);
});

