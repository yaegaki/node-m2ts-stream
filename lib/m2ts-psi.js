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
		
		if (!tsPacket.payloadUnitStartIndicator) {
			// fragment PSI. missing previous section data.
			this.invalid = true;
			this.fragment = true;
			return;
		} else {
			this.invalid = false;
		}
		
		var payload = tsPacket.payload.raw;
			
		// FIXME: この辺の処理を正しくする
		this.pointerField = payload[0];
		if (this.pointerField !== 0) {
			this.pointerFillerBytes = payload.raw.slice(1, 1 + this.pointerField);
		} else {
			this.pointerFillerBytes = null;
		}
		
		this.tsPackets = [tsPacket];
		this.pid = tsPacket.pid;
		this.continuityCounter = tsPacket.continuityCounter;
		var table = payload.slice(1 + this.pointerField);
		this.tableId = table[0];
		this.sectionSyntaxIndicator = (table[1] & 0x80) > 0;
		this.privateBit = (table[1] & 0x40) > 0;
		var sectionSize = table.readUInt16BE(1) & 0x03ff;
		
		if (sectionSize > 0) {
			this.section = {};
			this.section.raw = table.slice(3, Math.min(3 + sectionSize, table.length));
			this.section.size = sectionSize;
			if (this.section.raw.length < sectionSize) {
				// fragment PSI.
				this.fragment = true;
				return;
			} else {
				this.fragment = false;
			}
			
			this._parseSection();
		}
	}
	
	M2TsPSI.prototype.addFragmentData = function (tsPacket) {	
		if (!this.invalid && this.fragment) {
			if (Buffer.isBuffer(tsPacket)) {
				tsPacket = new M2TsPacket(tsPacket);
			}
			
			if (this.pid !== tsPacket.pid) {
				console.warn('different pid.');
				return false;
			}
			
			if (((this.continuityCounter + 1) & 0x0f) !== tsPacket.continuityCounter) {
				console.warn('missing packet.');
				return false;
			}
			
			this.tsPackets.push(tsPacket);
			
			var buf = new Buffer(Math.min(this.section.raw.length + tsPacket.payload.raw.length, this.section.size));
			this.section.raw.copy(buf);
			tsPacket.payload.raw.copy(buf, this.section.raw.length);
			this.section.raw = buf;
			
			if (this.section.size === this.section.raw.length) {
				this.fragment = false;
				this._parseSection();
			}
		}
		
		return true;
	};
	
	M2TsPSI.prototype._parseSection = function () {
		this.section.tableIdExtension = this.section.raw.readUInt16BE(0);
		this.section.versionNumber = (this.section.raw[2] & 0x3e) >> 1;
		this.section.currentNextIndicator = (this.section.raw[2] & 0x01) > 0;
		this.section.sectionNumber = this.section.raw[3];
		this.section.lastSectionNumber = this.section.raw[4];
		this.section.data = this.section.raw.slice(5, this.section.size - 4);
		this.section.crc = this.section.raw.readUInt32BE(this.section.size - 4);
		
		if (this._parseSectionData !== undefined) {
			this._parseSectionData();
		}
	};
	
	return M2TsPSI;
})();

module.exports = M2TsPSI;
