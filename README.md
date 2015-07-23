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
var inputStream = require('fs').createReadStream('hoge.ts');

inputStream.pipe(m2TsStrem).on('data', function (tsPacket) {
    console.log(tsPacket);
});

// PIDが0のものだけを取得する
m2TsStream.include(0x0).on(/**/);

// PIDが0のものを除外する
m2TsStream.exclude(0x0).on(/**/);
```
