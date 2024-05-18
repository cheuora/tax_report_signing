
const path = require('path');
const fs = require('fs');

const nodemailer = require('nodemailer');
const {Kafka} = require('kafkajs');

const kafka = new Kafka({
  clientId: 'mailpdffile',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({groupId : 'test3-group'});



// 메일 본문
const htmlContent = fs.readFileSync(path.join(__dirname, 'public', 'emailbody.html'), 'utf8');

function extractEmailFromFilename(filename) {
  // '_'를 구분자로 사용하여 파일 이름을 분리합니다.

  const parts = filename.split('_');
  
  // 두 번째 이메일 정보(두 번째 요소)를 추출합니다.
  if (parts.length > 1) {
    return parts[1];
  } else {
    throw new Error('파일 이름에서 두 번째 이메일 정보를 찾을 수 없습니다.');
  }
}

async function sendmail(pdffilename){
    //파일명 샘플 : modified_armi@nav.com_1715918647868_exelfiles.xlsx
    const targetEmailAddr = extractEmailFromFilename(path.basename(pdffilename)); //파일명에서 수신이메일 가져오기
    var tempSliced = path.basename(pdffilename).split('_'); 
    const attachmentFileName = tempSliced.slice(3).join('_'); //파일명에서 오리지널 pdf 파일명 잘라오기

    console.log("attachmentFileName:", attachmentFileName);

    let transporter = nodemailer.createTransport(
      {
        service: 'gmail',
        auth: {
          user: "logicalxxx@gmail.com",
          pass: "your password",
        }
      }
    );
    let mailOption = {
      from: "logicalxxx@gmail.com",
      to : targetEmailAddr,
      subject: "정산내역확인메일 입니다.",
      html: htmlContent,
      attachments: [
        {
          filename: attachmentFileName,
          path: pdffilename
        }
      ]
    }

    transporter.sendMail(mailOption, function(error, info){
      if(error) {
        console.log(error);
      }
      else{
        console.log('Email sent:' + info.response);
        //pdffiles, readyfiles 의 파일 삭제. 
        fs.unlink(pdffilename,(error) =>{
          if (error) {
              console.log("pdf 파일 삭제 실패");
          }
          else{
              console.log("pdf 파일삭제 성공");
          }
      })
      }
    }); 
    
}

const initKafka = async() => {
  await consumer.connect();
  await consumer.subscribe({topic: 'shouldbemailed', fromBeginning: true});
  await consumer.run({
    eachMessage: async({topic, partition, message}) => {
      var filename = message.value.toString();
      //pdf 파일 발송
      sendmail(path.join(__dirname,'pdffiles',filename));
      console.log("modified filename has been sent!");
    }
  });


};

initKafka();
