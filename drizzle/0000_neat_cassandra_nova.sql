CREATE TABLE "aa_fiu_consent_sessions" (
	"aa_session_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"consent_handle" uuid NOT NULL,
	"consent_id" uuid,
	"aa_provider_id" varchar(64) NOT NULL,
	"apk_ephemeral_x25519_pub_key_base64" varchar(128) NOT NULL,
	"apk_fiu_nonce_base64" varchar(64) NOT NULL,
	"purpose_code" char(3) DEFAULT '101' NOT NULL,
	"fetch_type" varchar(16) DEFAULT 'ONETIME' NOT NULL,
	"consent_status" varchar(24) DEFAULT 'PENDING' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aa_fiu_consent_sessions_consent_handle_unique" UNIQUE("consent_handle"),
	CONSTRAINT "aa_fiu_consent_sessions_consent_id_unique" UNIQUE("consent_id")
);
--> statement-breakpoint
CREATE TABLE "auth_pkce_challenges" (
	"auth_session_id" uuid PRIMARY KEY NOT NULL,
	"code_challenge" varchar(128) NOT NULL,
	"dpop_public_key_jwk" jsonb NOT NULL,
	"device_installation_id" varchar(64) NOT NULL,
	"play_integrity_nonce" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_refresh_sessions" (
	"session_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_family_id" uuid NOT NULL,
	"refresh_token_sha256" char(64) NOT NULL,
	"dpop_jkt_thumbprint" varchar(64) NOT NULL,
	"device_installation_id" varchar(64) NOT NULL,
	"play_integrity_verdict" varchar(32) NOT NULL,
	"is_rotated" boolean DEFAULT false NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rotated_at" timestamp with time zone,
	CONSTRAINT "auth_refresh_sessions_refresh_token_sha256_unique" UNIQUE("refresh_token_sha256")
);
--> statement-breakpoint
CREATE TABLE "ca_shared_review_links" (
	"share_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"share_token_sha256" char(64) NOT NULL,
	"encrypted_dossier_blob_base64" text,
	"storage_bucket" varchar(64) DEFAULT 'ca-dossiers',
	"storage_path" varchar(256),
	"aes_gcm_iv_hex" char(24) NOT NULL,
	"max_views" integer DEFAULT 3 NOT NULL,
	"current_views" integer DEFAULT 0 NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_shared_review_links_share_token_sha256_unique" UNIQUE("share_token_sha256")
);
--> statement-breakpoint
CREATE TABLE "chat_filing_sessions" (
	"session_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"assessment_year" varchar(7) DEFAULT '2026-27' NOT NULL,
	"chat_title" varchar(128) NOT NULL,
	"total_messages" integer DEFAULT 0 NOT NULL,
	"messages_json" jsonb NOT NULL,
	"summary_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dpop_replay_nonces" (
	"jti" varchar(128) PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "encrypted_tax_vault_backups" (
	"backup_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pan_blind_index_hmac" char(64) NOT NULL,
	"assessment_year" varchar(7) DEFAULT '2026-27' NOT NULL,
	"relationship_tag" varchar(16) DEFAULT 'SELF' NOT NULL,
	"version_number" integer DEFAULT 1 NOT NULL,
	"pbkdf2_salt_hex" char(64) NOT NULL,
	"aes_gcm_iv_hex" char(24) NOT NULL,
	"aes_gcm_auth_tag_hex" char(32) NOT NULL,
	"ciphertext_sha256_hex" char(64) NOT NULL,
	"ciphertext_payload_base64" text,
	"storage_bucket" varchar(64) DEFAULT 'ztvault-backups',
	"storage_path" varchar(256),
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unq_user_pan_ay" UNIQUE("user_id","pan_blind_index_hmac","assessment_year")
);
--> statement-breakpoint
CREATE TABLE "fcm_device_registrations" (
	"device_id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"fcm_token_encrypted" "bytea" NOT NULL,
	"preferred_locale" varchar(10) DEFAULT 'en-IN' NOT NULL,
	"advance_tax_alerts_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ifsc_directory_master" (
	"ifsc_code" char(11) PRIMARY KEY NOT NULL,
	"bank_name" varchar(100) NOT NULL,
	"branch_name" varchar(100) NOT NULL,
	"micr_code" char(9),
	"supports_cbdt_evc" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "isin_jan2018_fmv_master" (
	"isin_code" char(12) PRIMARY KEY NOT NULL,
	"bse_nse_amfi_code" varchar(32) NOT NULL,
	"security_name" varchar(150) NOT NULL,
	"asset_class" varchar(24) NOT NULL,
	"highest_price_jan31_2018_paise" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sbi_ttbr_rates_master" (
	"currency_code" char(3) NOT NULL,
	"rate_date" date NOT NULL,
	"is_month_end_official_rate" boolean DEFAULT false NOT NULL,
	"tt_buying_rate_paise" bigint NOT NULL,
	"source_circular_ref" varchar(128),
	CONSTRAINT "sbi_ttbr_rates_master_currency_code_rate_date_pk" PRIMARY KEY("currency_code","rate_date")
);
--> statement-breakpoint
CREATE TABLE "security_vapt_audit_logs" (
	"log_id" bigserial PRIMARY KEY NOT NULL,
	"event_timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid,
	"event_type" varchar(64) NOT NULL,
	"http_method" varchar(8) NOT NULL,
	"route_path" varchar(128) NOT NULL,
	"client_ip_hash_sha256" char(64) NOT NULL,
	"status_code" smallint NOT NULL,
	"vapt_rule_triggered" varchar(64)
);
--> statement-breakpoint
CREATE TABLE "statutory_ota_rule_bundles" (
	"bundle_version" varchar(32) PRIMARY KEY NOT NULL,
	"assessment_year" varchar(7) DEFAULT '2026-27' NOT NULL,
	"schema_ver" varchar(16) DEFAULT 'Ver1.2' NOT NULL,
	"payload_json" jsonb NOT NULL,
	"payload_sha256_hex" char(64) NOT NULL,
	"ed25519_signature_hex" char(128) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_hmac_sha256" char(64) NOT NULL,
	"email_encrypted_bytea" "bytea" NOT NULL,
	"google_sub_id" varchar(128),
	"account_status" varchar(24) DEFAULT 'ACTIVE' NOT NULL,
	"dpdp_consent_version" varchar(16) DEFAULT '2026.1' NOT NULL,
	"dpdp_consent_granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_hmac_sha256_unique" UNIQUE("email_hmac_sha256"),
	CONSTRAINT "users_google_sub_id_unique" UNIQUE("google_sub_id")
);
--> statement-breakpoint
ALTER TABLE "aa_fiu_consent_sessions" ADD CONSTRAINT "aa_fiu_consent_sessions_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_refresh_sessions" ADD CONSTRAINT "auth_refresh_sessions_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ca_shared_review_links" ADD CONSTRAINT "ca_shared_review_links_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_filing_sessions" ADD CONSTRAINT "chat_filing_sessions_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encrypted_tax_vault_backups" ADD CONSTRAINT "encrypted_tax_vault_backups_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fcm_device_registrations" ADD CONSTRAINT "fcm_device_registrations_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pkce_expires" ON "auth_pkce_challenges" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_auth_sessions_user" ON "auth_refresh_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_auth_sessions_family" ON "auth_refresh_sessions" USING btree ("token_family_id");--> statement-breakpoint
CREATE INDEX "idx_chat_sessions_user" ON "chat_filing_sessions" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "idx_dpop_nonces_expires" ON "dpop_replay_nonces" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_sbi_ttbr_lookup" ON "sbi_ttbr_rates_master" USING btree ("currency_code","rate_date");--> statement-breakpoint
CREATE INDEX "idx_vapt_logs_time" ON "security_vapt_audit_logs" USING btree ("event_timestamp");