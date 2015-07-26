var M2TsPSI = require('./m2ts-psi.js');
var util = require('util');

var M2TsPMT = (function () {
	function  M2TsPMT(tsPacket) {
		M2TsPSI.call(this, tsPacket);
		
		this._parseSectionData();
	}
	
	util.inherits(M2TsPMT, M2TsPSI);
	
	M2TsPMT.prototype.addFragmentData = function (tsPacket) {	
		M2TsPSI.prototype.addFragmentData.call(this, tsPacket);
		
		this._parseSectionData();
	};
	
	M2TsPMT.prototype._parseSectionData = function () {
		if (this.section === undefined || this.invalid || this.fragment) {
			return;
		}
		
		var data = this.section.data;
		this.pcrPid = data.readUInt16BE(0) & 0x1fff;
		this.programInfoSize = data.readUInt16BE(2) & 0x03ff;
		this.programDescriptors = data.slice(4, 4 + this.programInfoSize);
		this.esInfos = [];
		for (var i = 4 + this.programInfoSize; i < data.length;) {
			var esInfo = {};
			this.esInfos.push(esInfo);
			esInfo.streamType = data[i];
			esInfo.pid = data.readUInt16BE(i + 1) & 0x1fff;
			esInfo.infoSize = data.readUInt16BE(i + 3) & 0x03ff;
			esInfo.descriptors = data.slice(i + 5, i + 5 + esInfo.infoSize);
			i += 5 + esInfo.infoSize;
		}
	};
	
	return M2TsPMT;
})();

module.exports = M2TsPMT;
