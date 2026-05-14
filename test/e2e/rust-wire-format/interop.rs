use std::collections::HashMap;
use std::env;
use std::fs;
use std::process;

fn main() {
    if let Err(error) = run() {
        eprintln!("{error}");
        process::exit(1);
    }
}

fn run() -> Result<(), String> {
    let args: Vec<String> = env::args().collect();
    if args.len() != 3 {
        return Err("usage: interop <input-record> <output-record>".to_string());
    }

    let input = parse_record(&fs::read_to_string(&args[1]).map_err(|error| error.to_string())?)?;

    assert_field(&input, "timestamp.encoding", "binary/protobuf")?;
    assert_field(&input, "timestamp.messageType", "google.protobuf.Timestamp")?;
    assert_field(&input, "empty.encoding", "binary/protobuf")?;
    assert_field(&input, "empty.messageType", "google.protobuf.Empty")?;
    assert_field(&input, "empty.dataHex", "")?;

    let timestamp_bytes = hex_to_bytes(require_field(&input, "timestamp.dataHex")?)?;
    let timestamp = decode_timestamp(&timestamp_bytes)?;
    if timestamp != (Timestamp { seconds: 123, nanos: 456 }) {
        return Err(format!("unexpected TypeScript timestamp payload: {timestamp:?}"));
    }

    let output = format!(
        "timestamp.encoding=binary/protobuf\n\
         timestamp.messageType=google.protobuf.Timestamp\n\
         timestamp.dataHex={}\n\
         empty.encoding=binary/protobuf\n\
         empty.messageType=google.protobuf.Empty\n\
         empty.dataHex=\n",
        bytes_to_hex(&encode_timestamp(Timestamp {
            seconds: 987,
            nanos: 654,
        })),
    );

    fs::write(&args[2], output).map_err(|error| error.to_string())?;
    Ok(())
}

#[derive(Debug, PartialEq, Eq)]
struct Timestamp {
    seconds: i64,
    nanos: i32,
}

fn encode_timestamp(timestamp: Timestamp) -> Vec<u8> {
    let mut bytes = Vec::new();
    bytes.push(0x08);
    encode_varint(timestamp.seconds as u64, &mut bytes);
    bytes.push(0x10);
    encode_varint(timestamp.nanos as u64, &mut bytes);
    bytes
}

fn decode_timestamp(bytes: &[u8]) -> Result<Timestamp, String> {
    let mut index = 0;
    let mut seconds = None;
    let mut nanos = None;

    while index < bytes.len() {
        let tag = read_varint(bytes, &mut index)?;
        let field_number = tag >> 3;
        let wire_type = tag & 0b111;

        match (field_number, wire_type) {
            (1, 0) => seconds = Some(read_varint(bytes, &mut index)? as i64),
            (2, 0) => nanos = Some(read_varint(bytes, &mut index)? as i32),
            _ => {
                return Err(format!(
                    "unexpected timestamp protobuf tag {tag} at byte {index}",
                ));
            }
        }
    }

    Ok(Timestamp {
        seconds: seconds.ok_or("timestamp.seconds missing")?,
        nanos: nanos.ok_or("timestamp.nanos missing")?,
    })
}

fn encode_varint(mut value: u64, bytes: &mut Vec<u8>) {
    while value >= 0x80 {
        bytes.push((value as u8) | 0x80);
        value >>= 7;
    }
    bytes.push(value as u8);
}

fn read_varint(bytes: &[u8], index: &mut usize) -> Result<u64, String> {
    let mut value = 0_u64;
    let mut shift = 0;

    while *index < bytes.len() {
        let byte = bytes[*index];
        *index += 1;
        value |= u64::from(byte & 0x7f) << shift;

        if byte & 0x80 == 0 {
            return Ok(value);
        }

        shift += 7;
        if shift >= 64 {
            return Err("varint exceeds 64 bits".to_string());
        }
    }

    Err("unterminated varint".to_string())
}

fn parse_record(content: &str) -> Result<HashMap<String, String>, String> {
    let mut record = HashMap::new();

    for line in content.lines() {
        if line.is_empty() {
            continue;
        }

        let Some((key, value)) = line.split_once('=') else {
            return Err(format!("invalid record line: {line}"));
        };
        record.insert(key.to_string(), value.to_string());
    }

    Ok(record)
}

fn assert_field(
    record: &HashMap<String, String>,
    key: &str,
    expected: &str,
) -> Result<(), String> {
    let actual = require_field(record, key)?;
    if actual != expected {
        return Err(format!("{key} expected {expected:?}, got {actual:?}"));
    }
    Ok(())
}

fn require_field<'a>(
    record: &'a HashMap<String, String>,
    key: &str,
) -> Result<&'a str, String> {
    record
        .get(key)
        .map(String::as_str)
        .ok_or_else(|| format!("missing record field {key}"))
}

fn bytes_to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn hex_to_bytes(hex: &str) -> Result<Vec<u8>, String> {
    if hex.len() % 2 != 0 {
        return Err(format!("hex byte string must have even length: {hex}"));
    }

    let mut bytes = Vec::with_capacity(hex.len() / 2);
    for index in (0..hex.len()).step_by(2) {
        let byte = u8::from_str_radix(&hex[index..index + 2], 16)
            .map_err(|error| error.to_string())?;
        bytes.push(byte);
    }

    Ok(bytes)
}
