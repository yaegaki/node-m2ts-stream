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
		this.scramblingControl = (rawTsPacket[3] & 0xC0) >> 6;
		this.adaptationFieldControl = (rawTsPacket[3] & 0x30) >> 4;
		this.continuityCounter = rawTsPacket[3] & 0x0f;
		
		this.isScrambled = this.scramblingControl > 1;
		this.hasAdaptationField = this.adaptationFieldControl > 1;
		
		
		if (this.hasAdaptationField) {
			this.adaptationFieldSize = rawTsPacket[4];
			this.adaptationField = this.rawTsPacket.slice(4, 5 + this.adaptationFieldSize);
			this.discontinuityIndicator = (this.adaptationField[1] & 0x80) > 0;
			this.randomAccessIndicator = (this.adaptationField[1] & 0x40) > 0;
			this.elementaryStreamPriorityIndicator = (this.adaptationField[1] & 0x20) > 0;
			this.pcrFlag = (this.adaptationField[1] & 0x10) > 0;
			this.opcrFlag = (this.adaptationField[1] & 0x08) > 0;
			this.splicingPointFlag = (this.adaptationField[1] & 0x04) > 0;
			this.transportPrivateDataFlag = (this.adaptationField[1] & 0x02) > 0;
			this.adaptationFieldExtensionFlag = (this.adaptationField[1] & 0x01) > 0;
			if (this.adaptationField.length > 2) {
				this.adaptationFieldBody = this.adaptationField.slice(2);
			} else {
				this.adaptationFieldBody = null;
			}
		} else {
			this.adaptationFieldSize = 0;
		}
		
		this.payloadOffset = 0x04 + (this.hasAdaptationField ? 1 + this.adaptationFieldSize : 0);
	}
	
	return M2TsPacket;
})();

module.exports = M2TsPacket;
