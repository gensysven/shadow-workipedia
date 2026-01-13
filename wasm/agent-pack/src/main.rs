use std::{fs, path::PathBuf};

use serde::Serialize;

mod types;
use types::{AgentPriorsV1, AgentVocabV1, Pack};

#[derive(Serialize)]
struct PackMeta {
    version: u32,
    hash: String,
    bytes: usize,
}

fn main() {
    let vocab_path = PathBuf::from("public/agent-vocab.v1.json");
    let priors_path = PathBuf::from("public/agent-priors.v1.json");
    let out_path = PathBuf::from("public/agent-data.pack");
    let meta_path = PathBuf::from("public/agent-data.pack.meta.json");

    let vocab_json = fs::read_to_string(&vocab_path).expect("vocab read");
    let priors_json = fs::read_to_string(&priors_path).expect("priors read");

    let vocab: AgentVocabV1 = serde_json::from_str(&vocab_json).expect("vocab parse");
    let priors: AgentPriorsV1 = serde_json::from_str(&priors_json).expect("priors parse");

    let pack = Pack { version: 1, vocab, priors };
    let bytes = bincode::serialize(&pack).expect("pack serialize");
    let hash = blake3::hash(&bytes).to_hex().to_string();

    fs::write(&out_path, &bytes).expect("write pack");
    let meta = PackMeta { version: 1, hash, bytes: bytes.len() };
    fs::write(&meta_path, serde_json::to_vec_pretty(&meta).unwrap()).expect("write meta");
}
