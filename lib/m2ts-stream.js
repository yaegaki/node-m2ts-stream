/// <reference path="../types/node-0.11.d.ts" />
var stream = require('stream');
var util = require('util');
var WritableStreamBuffer = require('stream-buffers').WritableStreamBuffer;

var M2TsStream = (function () {
	var DecideSyncUnitSizeCount = 3;
	util.inherits(M2TsStream, stream.Transform);
	var SyncByte = 0x47;
	function M2TsStream (unitSize, includePids, excluedPids) {
		stream.Transform.call(this);
		if (includePids != null) {
			this.enableInclude = true;
			this.includePids = includePids;
		} else if (excluedPids != null) {
			this.enableExclude = true;
			this.excludePids = excluedPids;
		}
		this.buffer = new WritableStreamBuffer();
		this.unitSize = unitSize || -1;
		this.syncByteOffsets = [];
		this.dataOffset = -1;
	}
	
	M2TsStream.prototype._transform = function (chunk, encoding, callback) {
		if (this.unitSize < 0) {
			var offset = this.buffer.size();
			for (var i = 0; i < chunk.length; i++) {
				if (chunk[i] === SyncByte) {
					this.syncByteOffsets.push(i + offset);
				}
			}
			
			this.unitSize = this.decideUnitSize(this.syncByteOffsets);
			this.buffer.write(chunk);
			
			if (this.unitSize > 0) {
				this.syncByteOffsets = [];
				if (this.dataOffset > 0) {
					this.buffer.getContents(this.dataOffset);
				}
			}
		} else {
			this.buffer.write(chunk);
		}
		
		while (this.unitSize > 0 && this.buffer.size() >= this.unitSize) {
			var tsPacket = this.buffer.getContents(this.unitSize);
			var pid = tsPacket.readUInt16BE(1) & 0x1fff;
			var push = true;
			if (this.enableInclude) {
				push = this.includePids.indexOf(pid) >= 0;
			} else if (this.enableExclude) {
				push = this.excludePids.indexOf(pid) < 0;
			}
			if (push) {
				this.push(tsPacket);
			}
		}
		
		callback();
	};
	
	M2TsStream.prototype.decideUnitSize = function (syncByteOffsets, readCount) {
		readCount = readCount || 0;
		if (syncByteOffsets.length - readCount < DecideSyncUnitSizeCount) {
			return -1;
		}
		
		var diffs = [];
		var syncByteOffset = syncByteOffsets[readCount];
		for (var i = readCount + 1; i < syncByteOffsets.length; i++) {
			diffs.push(syncByteOffsets[i] - syncByteOffset);
		}
		
		for (var i = 0; i < diffs.length; i++) {
			var diff = diffs[i];
			var found = true;
			for (var j = 1; j <= DecideSyncUnitSizeCount; j++) {
				if (syncByteOffsets.indexOf(syncByteOffset + diff * j) < 0) {
					found = false;
					break;
				}
			}
			
			if (found) {
				this.dataOffset = syncByteOffset;
				return diff;
			}
		}
		
		return this.decideUnitSize(syncByteOffsets, readCount + 1);
	}
	
	M2TsStream.prototype.include = function (args) {
		if (!Array.isArray(args)) {
			args = Array.prototype.slice.call(arguments);
		}
		
		var stream = new M2TsStream(this.unitSize, args, null);
		this.pipe(stream);
		return stream;
	}
	
	M2TsStream.prototype.exclude = function (args) {
		if (!Array.isArray(args)) {
			args = Array.prototype.slice.call(arguments);
		}
		
		var stream = new M2TsStream(this.unitSize, null, args);
		this.pipe(stream);
		return stream;
	}
	
	return M2TsStream;
})();

module.exports = M2TsStream;
