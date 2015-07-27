/// <reference path="../types/node-0.11.d.ts" />

var M2TsStream = require('../');
var fs = require('fs');

var input = fs.createReadStream('input.ts');
var pat = null;
var pmtPids = [];
var pmtMap = {
	complete: {},
	fragment: {}
};

function isPAT(tsPacket) {
	return tsPacket.pid === 0;
}

function isPMT(tsPacket) {
	return pmtPids.indexOf(tsPacket.pid) >= 0;
}

function isES(tsPacket) {
	for (var i in pmtMap.complete) {
		var pmt = pmtMap.complete[i];
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
			var lastPmt = pmtMap.fragment[tsPacket.pid];
			if (lastPmt != null) {
				if (lastPmt.addFragmentData(tsPacket)) {
					if (lastPmt.fragment) {
						pmtMap.fragment[lastPmt.pid] = lastPmt;
					} else {
						pmtMap.complete[lastPmt.pid] = lastPmt;
						pmtMap.fragment[lastPmt.pid] = null;
					}
				} else {
					pmtMap.fragment[lastPmt.pid] = null;
				}
			} else {
				var pmt = new M2TsStream.PMT(tsPacket);
				if (!pmt.invalid) {
					if (pmt.fragment) {
						pmtMap.fragment[pmt.pid] = pmt;
					} else {
						pmtMap.complete[pmt.pid] = pmt;
					}
				}
			}
		} else if (isES(tsPacket)) {
			console.log(tsPacket);
		}
	});