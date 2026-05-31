use llm_adapter::core::{CapabilityAttachment, ModelCapability, ModelRegistryVariant};

fn image_attachment() -> CapabilityAttachment {
  CapabilityAttachment {
    kinds: vec!["image".to_string()],
    source_kinds: Some(vec!["url".to_string(), "data".to_string()]),
    allow_remote_urls: Some(true),
  }
}

fn text_capability(image_attachment: &CapabilityAttachment) -> ModelCapability {
  ModelCapability {
    input: vec!["text".to_string(), "image".to_string()],
    output: vec!["text".to_string(), "object".to_string()],
    attachments: Some(image_attachment.clone()),
    structured_attachments: None,
    default_for_output_type: None,
  }
}

fn anthropic_variant(
  backend_kind: &str,
  canonical_key: &str,
  raw_model_id: &str,
  aliases: &[&str],
  request_layer: &str,
  behavior_flags: &[&str],
  display_name: &str,
  image_attachment: &CapabilityAttachment,
) -> ModelRegistryVariant {
  ModelRegistryVariant {
    backend_kind: backend_kind.to_string(),
    canonical_key: canonical_key.to_string(),
    raw_model_id: raw_model_id.to_string(),
    display_name: Some(display_name.to_string()),
    aliases: aliases.iter().map(|value| value.to_string()).collect(),
    legacy_aliases: None,
    capabilities: vec![text_capability(image_attachment)],
    protocol: Some("anthropic".to_string()),
    request_layer: Some(request_layer.to_string()),
    route_overrides: None,
    behavior_flags: if behavior_flags.is_empty() {
      None
    } else {
      Some(behavior_flags.iter().map(|value| value.to_string()).collect())
    },
  }
}

pub(crate) fn scholar_extra_model_registry_variants() -> Vec<ModelRegistryVariant> {
  let image_attachment = image_attachment();
  vec![
    anthropic_variant(
      "anthropic",
      "claude-haiku-4.5",
      "claude-haiku-4-5-20251001",
      &["claude-haiku-4.5", "claude-haiku-4-5"],
      "anthropic",
      &[],
      "Claude Haiku 4.5",
      &image_attachment,
    ),
    anthropic_variant(
      "anthropic",
      "claude-opus-4.6",
      "claude-opus-4-6",
      &["claude-opus-4.6", "claude-opus-4-6"],
      "anthropic",
      &["reasoning_budget_12000"],
      "Claude Opus 4.6",
      &image_attachment,
    ),
    anthropic_variant(
      "anthropic_vertex",
      "claude-haiku-4.5",
      "claude-haiku-4-5@20251001",
      &["claude-haiku-4.5", "claude-haiku-4-5"],
      "vertex_anthropic",
      &[],
      "Claude Haiku 4.5",
      &image_attachment,
    ),
    anthropic_variant(
      "anthropic_vertex",
      "claude-opus-4.6",
      "claude-opus-4-6",
      &["claude-opus-4.6", "claude-opus-4-6"],
      "vertex_anthropic",
      &["reasoning_budget_12000"],
      "Claude Opus 4.6",
      &image_attachment,
    ),
  ]
}
