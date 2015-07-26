var M2TsPSI = require('./m2ts-psi.js');
var util = require('util');

var M2TsPMT = (function () {
	function  M2TsPMT(tsPacket) {
		M2TsPSI.call(this, tsPacket);
	}
	
	util.inherits(M2TsPMT, M2TsPSI);

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
			esInfo.rawDescriptors = data.slice(i + 5, i + 5 + esInfo.infoSize);
			esInfo.descriptors = [];
			for (var descriptorOffset = 0; descriptorOffset < esInfo.rawDescriptors.length;) {
				var descriptor = {};
				descriptor.tag = esInfo.rawDescriptors[descriptorOffset];
				descriptor.size = esInfo.rawDescriptors[descriptorOffset + 1];
				descriptor.data = esInfo.rawDescriptors.slice(descriptorOffset + 2, descriptorOffset + 2 + descriptor.size);
				descriptorOffset += 2 + descriptor.size;
				esInfo.descriptors.push(descriptor);
			}
			i += 5 + esInfo.infoSize;
		}
	};
	
	return M2TsPMT;
})();

module.exports = M2TsPMT;
