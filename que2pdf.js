
//Watch working directory and make change xlsx files to pdf on the fly.
//Use Unoserver for transforming xlsx to pdf 
const path = require('path');
const {Kafka} = require('kafkajs');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const kafka = new Kafka({
  clientId: 'receiveXlsxFile',
  brokers: ['localhost:9092']
})

const consumer = kafka.consumer({groupId : 'test2-group'});
const producer = kafka.producer();
const pdfDirectory = path.join(__dirname,'pdffiles');

async function sendPostRequest(xlsxfilename){
  const url = 'http://127.0.0.1:2004/request';
  const formData = new FormData();

  // 파일 추가
  formData.append('file', fs.createReadStream(xlsxfilename));
  // 추가 폼 필드
  formData.append('convert-to', 'pdf');

  try {
    const response = await axios.post(url, formData, {
        headers: {
            ...formData.getHeaders(),
        },
        responseType: 'arraybuffer' // 파일로 다운로드 받기 위해 필요
    });


    // 파일로 저장
    fs.writeFileSync(pdfDirectory + '/' + path.basename(xlsxfilename) + '.pdf', response.data);
    console.log('PDF File downloaded and saved');
    // 엑셀 파일 삭제
    fs.unlink(xlsxfilename,(error) =>{
      if (error) {
          console.log("작업 엑셀 파일 삭제 실패");
      }
      else{
          console.log("작업 엑셀 파일 삭제 성공");
      }
    })

  }catch (error) {
        console.error('Error during the request:', error.message);
  }
}

const initKafka = async() => {
  await consumer.connect();
  await producer.connect();
  await consumer.subscribe({topic: 'xlsxfiles', fromBeginning: true});
  await consumer.run({
    eachMessage: async({topic, partition, message}) => {
      var filename = message.value.toString();
      sendPostRequest(path.join(__dirname,'readyfiles', filename));
      var pdffile = filename + ".pdf";
      await producer.send({
        topic: 'shouldbemailed',
        messages: [
          {value: pdffile},
        ]
      })
      console.log("modified filename has been sent!");

    }
  });

};


initKafka();


