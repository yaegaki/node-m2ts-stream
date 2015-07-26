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
		this.hasPayload = (this.adaptationFieldControl & 0x01) > 0;
		
		
		if (this.hasAdaptationField) {
			this.adaptationField = {};
			this.adaptationField.size = rawTsPacket[4];
			this.adaptationField.raw = rawTsPacket.slice(4, 5 + this.adaptationField.size);
			this.adaptationField.discontinuityIndicator = (this.adaptationField.raw[1] & 0x80) > 0;
			this.adaptationField.randomAccessIndicator = (this.adaptationField.raw[1] & 0x40) > 0;
			this.adaptationField.elementaryStreamPriorityIndicator = (this.adaptationField.raw[1] & 0x20) > 0;
			this.adaptationField.pcrFlag = (this.adaptationField.raw[1] & 0x10) > 0;
			this.adaptationField.opcrFlag = (this.adaptationField.raw[1] & 0x08) > 0;
			this.adaptationField.splicingPointFlag = (this.adaptationField.raw[1] & 0x04) > 0;
			this.adaptationField.transportPrivateDataFlag = (this.adaptationField.raw[1] & 0x02) > 0;
			this.adaptationField.extensionFlag = (this.adaptationField.raw[1] & 0x01) > 0;
			if (this.adaptationField.raw.length > 2) {
				this.adaptationField.Body = this.adaptationField.raw.slice(2);
			} else {
				this.adaptationField.Body = null;
			}
		} else {
			this.adaptationField = null;
		}
		
		if (this.hasPayload) {
			this.payloadOffset = 0x04 + (this.hasAdaptationField ? 1 + this.adaptationField.size : 0);
			this.payload = {};
			this.payload.raw = rawTsPacket.slice(this.payloadOffset, rawTsPacket.length);
		}
	}
	
	return M2TsPacket;
})();

module.exports = M2TsPacket;
