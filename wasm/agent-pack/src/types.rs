use serde::{Deserialize, Serialize};

pub type AgentVocabV1 = serde_json::Value;
pub type AgentPriorsV1 = serde_json::Value;

#[derive(Serialize, Deserialize)]
pub struct Pack {
    pub version: u32,
    pub vocab: AgentVocabV1,
    pub priors: AgentPriorsV1,
}
