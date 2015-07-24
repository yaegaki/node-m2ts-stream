var M2TsPacket = (function () {
	var SyncByte = 0x47;
	function M2TsPacket(rawTsPacket) {
		if (rawTsPacket[0] !== SyncByte) {
			console.warn('broken TsPacket.');
			return;
		}
		
		this.rawTsPacket = rawTsPacket;
		this.unitSize = rawTsPacket.length;
		this.transportErrorIndicator = (rawTsPacket[1] & 0x80) > 0;
		this.payloadUnitStartIndicator = (rawTsPacket[1] & 0x40) > 0;
		this.transportPriority = (rawTsPacket[1] & 0x20) > 0;
		this.pid = rawTsPacket.readUInt16BE(1) & 0x1fff;
		this.transportScrambleControl = (rawTsPacket[3] & 0xC0) >> 6;
		this.adaptationFieldControl = (rawTsPacket[3] & 0x30) >> 4;
		this.cyclicCounter = rawTsPacket[3] & 0x0f;
		
		this.isScrambled = this.transportScrambleControl > 1;
		this.hasAdaptationField = this.adaptationFieldControl > 1;
		
		
		// has adaptaion field.
		if (this.hasAdaptationField) {
			this.adaptationFieldSize = rawTsPacket.readUInt16BE(4);
			// TODO: parse adaptation field
		} else {
			this.adaptationFieldSize = 0;
		}
		
		this.payloadOffset = 0x04 + this.adaptationFieldSize; 
	}
	
	return M2TsPacket;
})();

module.exports = M2TsPacket;
