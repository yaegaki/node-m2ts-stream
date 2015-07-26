var M2TsPSI = require('./m2ts-psi.js');
var util = require('util');

var M2TsPAT = (function () {
	function  M2TsPAT(tsPacket) {
		M2TsPSI.call(this, tsPacket);
		
		if (this.section === undefined) {
			return;
		}
		
		this.pmtInfos = [];
		for (var i = 0; i < this.section.data.length; i += 4) {
			this.pmtInfos.push({
				programNumber: this.section.data.readUInt16BE(i),
				pid: this.section.data.readUInt16BE(i + 2) & 0x1fff
			});
		}
	}
	
	util.inherits(M2TsPAT, M2TsPSI);
	
	return M2TsPAT;
})();

module.exports = M2TsPAT;
