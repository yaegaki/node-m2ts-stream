/// <reference path="../types/node-0.11.d.ts" />

var M2TsStream = require('../');
var fs = require('fs');

var input = fs.createReadStream('input.ts');
var pat = null;
var pmtPids = [];
var pmtMap = {};

function isPAT(tsPacket) {
	return tsPacket.pid === 0;
}

function isPMT(tsPacket) {
	return pmtPids.indexOf(tsPacket.pid) >= 0;
}

function isES(tsPacket) {
	for (var i in pmtMap) {
		var pmt = pmtMap[i];
		if (!pmt.fragment) {
			var esPids = pmt.esInfos.map(function (esInfo) { return esInfo.pid; });
			if (esPids.indexOf(tsPacket.pid) >= 0) {
				return true;
			}
		}
	}
	
	return false;
}

input.pipe(new M2TsStream())
	.parse()
	.on('data', function (tsPacket) {
		if (isPAT(tsPacket)) {
			pat = new M2TsStream.PAT(tsPacket);
			pmtPids = pat.pmtInfos.map(function (info) { return info.pid; });
		} else if (isPMT(tsPacket)) {
			var lastPmt = pmtMap[tsPacket.pid];
			if (lastPmt !== undefined && lastPmt.fragment) {
				lastPmt.addFragmentData(tsPacket);
			} else {
				var pmt = new M2TsStream.PMT(tsPacket);
				pmtMap[pmt.pid] = pmt;
			}
		} else if (isES(tsPacket)) {
			console.log(tsPacket);
		}
	});