var M2TsPacket = require('./m2ts-packet.js');

var M2TsPES = (function () {
	function M2TsPES(tsPacket) {
		if (Buffer.isBuffer(tsPacket)) {
			tsPacket = new M2TsPacket(tsPacket);
		}
		
		var payload = tsPacket.payload.raw;
		var startCode = ((payload[0] & 0xff) | (payload[1] & 0xff)) + payload[2];
		if (startCode !== 1) {
			// fragment PES. missing previous data or unknown error.
			this.invalid = true;
			this.fragment = true;
			return;
		} else {
			this.invalid = false;
		}
		
		this.tsPackets = [tsPacket];
		this.pid = tsPacket.pid;
		this.continuityCounter = tsPacket.continuityCounter;
		this.streamId = payload[3];
		// packet size = (3 + header size + body size)
		this.packetSize = payload.readUInt16BE(4);
		
		this.isAudio = this.streamId >= 0xc0 && this.streamId <= 0xdf;
		this.isVideo = this.streamId >= 0xE0 && this.streamId <= 0xef;
		
		if (this.packetSize > (payload.length - 5) || this.packetSize === 0) {
			this.fragment = true;
		} else {
			this.fragment = false;
		}
		
		// Sync code is always 0b10
		// this.syncCode = (payload[6] & 0xc0) >> 6;
		this.scramblingControl = (payload[6] & 0x30) >> 4;
		this.priority = (payload[6] & 0x08) >> 3;
		this.dataAlignmentIndicator = (payload[6] & 0x04) > 0;
		this.copylight = (payload[6] & 0x02) > 0;
		this.originalOrCopy = (payload[6] & 0x01) > 0;
		this.PTSDTSFlag = (payload[7] & 0xc0) >> 6;
		this.ESCRFlag = (payload[7] & 0x20) > 0;
		this.ESRateFlag = (payload[7] & 0x10) > 0;
		this.DSMTrickModeFlag = (payload[7] & 0x08) > 0;
		this.additionalCopyInfoFlag = (payload[7] & 0x04) > 0;
		this.CRCFlag = (payload[7] & 0x02) > 0;
		this.extensionFlag = (payload[7] & 0x01) > 0;
		this.headerDataSize = payload[8];
				
		// this.PTSDTSFlag === 0x01 is forbidden
		this.hasPTS = (this.PTSDTSFlag & 0x02) > 0;
		this.hasDTS = (this.PTSDTSFlag & 0x03) === 0x03;
		
		if (this.headerDataSize > 0) {
			this.headerData = {};
			var header = this.headerData.raw = payload.slice(9, 9 + this.headerDataSize);
			this.headerData.size = this.headerDataSize;
			var offset = 0;
			
			if (this.hasPTS) {
				this.headerData.PTS = ((header[offset] & 0x0e) << 0x1d) |
									  ((header[offset + 1]) << 0x16) |
									  ((header[offset + 2] & 0xfe) << 0x0e) |
									  ((header[offset + 3]) << 0x07) |
									  ((header[offset + 4] & 0xfe) >> 0x01);
				offset += 5;
			}
			
			if (this.hasDTS) {
				this.headerData.DTS = ((header[offset] & 0x0e) << 0x1d) |
									  ((header[offset + 1]) << 0x16) |
									  ((header[offset + 2] & 0xfe) << 0x0e) |
									  ((header[offset + 3]) << 0x07) |
									  ((header[offset + 4] & 0xfe) >> 0x01);
				offset += 5;
			}
			
			// TODO: parse headerData
			if (this.ESCRFlag) {
				offset += 6;
			}
			
			if (this.ESRateFlag) {
				offset += 3;
			}
			
			if (this.addtionalCopyInfoFlag) {
				offset += 1;
			}
			
			if (this.CRCFlag) {
				offset += 2;
			}
			
			if (this.extensionFlag) {
				this.headerData.privateDataFlag = (header[offset] & 0x80) > 0;
				this.headerData.packHeaderFieldFlag = (header[offset] & 0x40) > 0;
				this.headerData.programPacketSequenceCounterFlag = (header[offset] & 0x20) > 0;
				this.headerData.PSTDBufferFlag = (header[offset] & 0x10) > 0;
				this.headerData.extensionFlag2 = (header[offset] & 0x01) > 0;
				offset += 1;
			}
			
			if (!!this.headerData.privateDataFlag) {
				// user defined data
				offset += 16;
			}
			
			if (!!this.headerData.packHeaderFieldFlag) {
				offset += 1;
			}
			
			if (!!this.headerData.programPacketSequenceCounterFlag) {
				this.headerData.packetSequenceCounter = header[offset] & 0x7f;
				this.headerData.MPEG1MPEG2Identifier = (header[offset + 1] & 0x40) > 0;
				this.headerData.originalStuffingLength = header[offset + 1] & 0x1f;
				offset += 2;
			}

			if (!!this.headerData.PSTDBufferFlag) {
				// PSTDBufferScale: 0 = 128bytes, 1 = 1024bytes
				this.headerData.PSTDBufferScale = (header[offset] & 0x20) > 0;
				this.headerData.PSTDBufferSize = header.readUInt16BE(offset) & 0x1fff;
				offset += 2;
			}
			
			if (!!this.headerData.extensionFlag2) {
				this.headerData.extensionFieldLength = header[offset] & 0x7f;
				offset += 2;
			}
		}
		this.body = {};
		this.body.size = this.packetSize - (3 + this.headerDataSize);
		if (this.packetSize === 0) {
			// Video Elementary Stream
			this.body.raw = payload.slice(9 + this.body.size);
		} else {
			if (this.fragment) {
				this.body.raw = new Buffer(this.body.size);
				payload.copy(this.body.raw, 9 + this.headerDataSize);
			} else {
				this.body.raw = payload.slice(9 + this.headerDataSize, 9 + this.headerDataSize + this.body.size);
			}
		}
	}
	
	M2TsPES.prototype.addFragmentData = function (tsPacket) {
		if (this.packetSize === 0) {
			console.warn('can not add fragment data.');
			return false;
		}
		
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
			
			var buf = new Buffer(Math.min(this.body.raw.length + tsPacket.payload.raw.length, this.body.size));
			this.body.raw.copy(buf);
			tsPacket.payload.raw.copy(buf, this.body.raw.length);
			this.body.raw = buf;
			
			if (this.body.size === this.body.raw.length) {
				this.fragment = false;
			}
		}
		
		return true;
	};

	return M2TsPES;	
})();

module.exports = M2TsPES;
