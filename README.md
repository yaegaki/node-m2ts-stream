# node-m2ts-stream

入力ストリームから流れてくるバイナリデータをm2tsパケットに分割して出力ストリームに流します.  
m2tsのパケットサイズは入力バイナリから自動で特定します.  

インストール
----------

```
npm install m2ts-stream
```

使い方
----------

```javascript
var M2TsStream = require('m2ts-stream');
var m2TsStream = new M2TsStream();
var fs = require('fs');
var inputStream = fs.createReadStream('hoge.ts');

inputStream.pipe(m2TsStrem).on('data', function (rawTsPacket) {
    console.log(rawTsPacket);
});

// PIDが0のものだけを取得する
m2TsStream.include(0x0).on(/**/);

// PIDが0のものを除外する
m2TsStream.exclude(0x0).on(/**/);

// スクランブルされたパケットを廃棄してファイルに書き込む
m2TsStream
    .parse()
    .where(function (tsPacket) {
        return !tsPacket.isScrambled;
    })
    .unparse()
    .pipe(fs.createWriteStream('hoge2.ts'));
```
