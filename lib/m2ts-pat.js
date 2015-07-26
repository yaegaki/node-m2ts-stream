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
			var programNumber = this.section.data.readUInt16BE(i);
			var pid = this.section.data.readUInt16BE(i + 2) & 0x1fff;
			if (programNumber === 0) {
				this.networkPid = pid;
			} else {
				this.pmtInfos.push({
					programNumber: programNumber,
					pid: pid
				});
			}
		}
	}
	
	util.inherits(M2TsPAT, M2TsPSI);
	
	return M2TsPAT;
})();

module.exports = M2TsPAT;
