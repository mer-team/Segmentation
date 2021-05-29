// Song: Cartoon - Howling (Ft. Asena)[NCS Release]
// Music provided by NoCopyrightSounds
// Free Download/Stream: http://ncs.io/Howling
// Watch: http://youtu.be/JiF3pbvR5G0

const fs = require('fs');
var amqp = require('amqplib/callback_api');

const config={
  protocol: 'amqp',
  hostname: 'localhost',
  port: 5672,
  username: 'merUser',
  password: 'passwordMER',
}

const GITHUB_WORKSPACE = process.env.GITHUB_WORKSPACE;
      qMain = "segmentation",
      vID = "JiF3pbvR5G0",
      file = "original14.wav",
      qRec = "management";

describe('Testing RabbitMQ', ()=>{
  it('Should connect to the RabbitMQ', (done)=>{
    amqp.connect(config, (err, conn)=>{
      if(err){
        console.log("Connection Error");
        return;
      }
      done();
      setTimeout(function() { conn.close();}, 500);
    });
  });

  it('Should send a music to separate', (done)=>{
    amqp.connect(config, (err, conn)=>{
      if(err){
        console.log("Connection Error");
        return;
      }
      conn.createChannel((err, ch)=>{
        if(err){
          console.log("Error Creating Channel");
          return;
        }
        ch.assertQueue(qMain, { durable: false }); 
        ch.sendToQueue(qMain, Buffer.from(vID),
          function(err) {
            if(err) {
              console.log("Error sending the message: ",err);
              return;         
            } else {
              console.log("Message sent");
              done();
          }
        });
      });
      done();
      setTimeout(function() { conn.close();}, 500);
    });
  });

  it('Should create the RabbitMQ channel', (done)=>{
    amqp.connect(config, (err, conn)=>{
      if(err){
        console.log("Connection Error");
        return;
      }
      conn.createConfirmChannel((err, ch)=>{
        if(err){
          console.log("Error Creating Channel");
          return;
        }
        done();
        setTimeout(function() { conn.close();}, 500);
      });
    });
  });

  it('Should split the music', function(done) {
    setTimeout(function(){
      fs.access(`${GITHUB_WORKSPACE}/src/test/JiF3pbvR5G0/${file}`, fs.F_OK, (err) => {
        if (err) {
          console.error(err)
          console.log("File not found!");
          return
        }
        console.log("File found!");
        done();
      })}, 15000);
  });

  it("Should receive a message from the RabbitMQ", (done)=>{
    amqp.connect(config, (err, conn)=>{
      if(err){
        console.log("Connection Error");
        return;
      }
      conn.createChannel( (err, ch)=>{
        if(err){
          console.log("Error Creating Channel");
          return;
        }
        ch.assertQueue(qRec, { durable: false });
        ch.consume(qRec, function (msg) {
          if (msg){
            done();
            setTimeout(function() { conn.close();}, 500);
          } else {
            console.log("Unexpected message");
            return;
          }
        }, { noAck: true });
      });
    });
  });
});