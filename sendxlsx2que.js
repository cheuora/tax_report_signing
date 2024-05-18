
//Watch working directory and make change xlsx files to pdf on the fly.
//Use Unoserver for transforming xlsx to pdf 
const path = require('path');
const chokidar = require('chokidar');
const {Kafka} = require('kafkajs');

const kafka = new Kafka({
  clientId: 'sendXlsxFile',
  brokers: ['localhost:9092']
})

const producer = kafka.producer();

// 감시할 디렉토리 지정
const directoryToWatch = path.join(__dirname, 'readyfiles');
//pdf작업 디렉토리 지정


async function sendToKafka(xlsxfilename){  
    try {
      await producer.connect();
      await producer.send({
        topic: 'xlsxfiles',
        messages:[
          {value: path.basename(xlsxfilename)}
        ]
      })
      console.log("Sending Filename to kafka is done!");
      await producer.disconnect();

    }catch (error) {
          console.error('Error during sending to kafka:', error.message);
    }
}

// chokidar 감시자 설정
const watcher = chokidar.watch(directoryToWatch, {
  ignored: /(^|[\/\\])\../, // 숨김 파일 무시
  persistent: true
});
  

// 파일이 추가되었을 때의 이벤트 핸들러
watcher.on('add', path => {sendToKafka(path);console.log(`File ${path} has been sent`)});


// 에러 핸들링
watcher.on('error', error => console.log(`Watcher error: ${error}`));

console.log(`Now watching for file changes in ${directoryToWatch}`);

