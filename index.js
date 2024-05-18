const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { error } = require('console');



const app = express();
const port = 3000;

// 파일 저장을 위한 multer 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, req.body.email + '_' + Date.now() + '_' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// 정적 파일 제공 설정 (HTML 포함)
app.use(express.static('public'));


app.post('/upload', upload.fields([
    { name: 'excelFile', maxCount: 1 },
    { name: 'signFile', maxCount: 1 }
]), async(req, res) => {

    if (!req.files) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const filePath = path.join(__dirname, 'uploads', req.files['excelFile'][0].filename);
        const signPath = path.join(__dirname, 'uploads', req.files['signFile'][0].filename);
        const modifiedFilePath = path.join(__dirname, 'readyfiles', 'modified_' + req.files['excelFile'][0].filename);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

        const sizeOf =require('image-size');
        var dimension = sizeOf(signPath);
        // Define default cell dimensions
        const defaultCellWidth = 64; // pixels
        const defaultCellHeight = 20; // pixels

        //const worksheet = workbook.getWorksheet('Sheet1'); // 첫 번째 워크시트 선택
        const worksheet = workbook.getWorksheet(1); // 첫 번째 워크시트 선택


        // 이미지 추가
        const imageId = workbook.addImage({
            buffer: fs.readFileSync(signPath), // 이미지 경로 변경 필요
            extension: 'png',
        });

        //J4 Cell의 중앙좌표 계산
        const colIndex = 9;
        const rowIndex = 3;


        worksheet.addImage(imageId,{
            tl: {col: colIndex+0.999, row:rowIndex},
            ext: {width:dimension.width, height:dimension.height},
            editAs: 'absolute'
        } );


        // 수정된 파일 저장
        //await workbook.xlsx.writeFile(modifiedFilePath);
        const buffer = await workbook.xlsx.writeBuffer();
        fs.writeFileSync(modifiedFilePath, buffer);

        //작업 후 upload 폴더의 오리지널 파일(이미지, 엑셀) 삭제
        fs.unlink(filePath,(error) =>{
            if (error) {
                console.log("원본 파일 삭제 실패");
            }
            else{
                console.log("원본 파일삭제 성공");
            }
        })
        fs.unlink(signPath,(error) =>{
            if (error) {
                console.log("이미지 파일 삭제 실패");
            }
            else{
                console.log("이미지 파일삭제 성공");
            }
        })
	
        res.sendFile(path.join(__dirname, 'public', 'end.html'));
    } catch (error) {
        console.error(error);
        //res.status(500).send('An error occurred.');
        res.status(500).sendFile(path.join(__dirname, 'public', 'xlsxerror.html'))
    }

});


// 정적 파일 제공 (업로드 폴더)
app.use('/uploads', express.static('uploads'));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});

