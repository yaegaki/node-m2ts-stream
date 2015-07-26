var M2TsPacket = require('./m2ts-packet.js');

var M2TsPSI = (function () {
	function M2TsPSI(tsPacket) {
		if (Buffer.isBuffer(tsPacket)) {
			tsPacket = new M2TsPacket(tsPacket);
		}
		
		if (!tsPacket.hasPayload) {
			console.warn('doesn\'t have payload');
			return;
		}
		
		var payload = tsPacket.payload.raw;
		this.tableId = payload[0];
		this.sectionSyntaxIndicator = (payload[1] & 0x80) > 0;
		this.privateBit = (payload[1] & 0x40) > 0;
		var sectionSize = payload.readUInt16BE(1) & 0x03ff;
		
		if (sectionSize > 0) {
			this.section = {};
			this.section.raw = payload.slice(3, 3 + sectionSize);
			this.section.size = sectionSize;
			
			this.section.tableIdExtension = this.section.raw.readUInt16BE(0);
			this.section.versionNumber = (this.section.raw[2] & 0x3e) >> 1;
			this.section.currentNextIndicator = (this.section.raw[2] & 0x01) > 0;
			this.section.sectionNumber = this.section.raw[3];
			this.section.lastSectionNumber = this.section.raw[4];
			this.section.data = this.section.raw.slice(5, sectionSize - 4);
			this.section.crc = this.section.raw.readUInt32BE(sectionSize - 4);
			}
	}
	
	return M2TsPSI;
})();

module.exports = M2TsPSI;
