drop table if exists scan_verification_session;
drop table if exists audit_log;
drop table if exists scale_record;
drop table if exists medication;
drop table if exists health_record;
drop table if exists sms_relay_device;
drop table if exists elder;

create table elder (
  id varchar(64) primary key,
  archive_no varchar(64) not null,
  name_enc varchar(255),
  gender varchar(16),
  age int,
  emergency_contact_name_enc varchar(255),
  emergency_phone_enc varchar(255),
  backup_contact_name_enc varchar(255),
  backup_phone_enc varchar(255),
  relationship varchar(64),
  abo_type varchar(16),
  rh_type varchar(16),
  allergy_enc varchar(255),
  residence_enc varchar(255),
  status varchar(32) not null
);

create table health_record (
  id varchar(64) primary key,
  elder_id varchar(64) not null,
  record_date varchar(32),
  volunteer varchar(64),
  height_cm decimal(10,2),
  weight_kg decimal(10,2),
  waist_cm decimal(10,2),
  bmi decimal(10,2),
  health_self_assessment varchar(64),
  self_care_assessment varchar(64),
  cognitive_screening varchar(64),
  emotion_screening varchar(64),
  created_at timestamp default current_timestamp
);

create table medication (
  id varchar(64) primary key,
  elder_id varchar(64) not null,
  name_enc varchar(255),
  dosage_enc varchar(255),
  usage_text_enc varchar(255),
  timing_enc varchar(255),
  updated_at varchar(32) default '2026-05-30 10:00:00'
);

create table scale_record (
  id varchar(64) primary key,
  elder_id varchar(64) not null,
  scale_name varchar(64),
  score int,
  record_date varchar(32),
  volunteer varchar(64),
  payload_enc clob,
  created_at timestamp default current_timestamp
);

create table audit_log (
  id varchar(64) primary key,
  time timestamp,
  operator varchar(255),
  role varchar(64),
  source_ip varchar(64),
  target varchar(255),
  action varchar(128),
  verification_method varchar(64),
  visitor_name_enc varchar(255),
  visitor_phone_enc varchar(255),
  visitor_id_card_enc varchar(255),
  result varchar(32),
  fail_reason varchar(255),
  request_id varchar(128)
);

create table scan_verification_session (
  session_id varchar(128) primary key,
  elder_id varchar(64) not null,
  target varchar(64),
  relay_device_id varchar(64),
  receiver_phone varchar(32),
  message_body varchar(255),
  message_prefix varchar(64),
  verification_method varchar(64),
  status varchar(32),
  expires_at varchar(64),
  verified boolean,
  verified_at varchar(64),
  sender_phone_masked varchar(64),
  visitor_name_enc varchar(255),
  visitor_phone_enc varchar(255),
  visitor_id_card_enc varchar(255),
  created_at timestamp default current_timestamp
);

create table sms_relay_device (
  id bigint auto_increment primary key,
  device_id varchar(64) not null,
  receiver_phone varchar(32),
  server_url varchar(255),
  message_prefix varchar(32),
  device_secret varchar(255),
  status varchar(32),
  updated_at timestamp default current_timestamp,
  last_heartbeat varchar(64)
);
