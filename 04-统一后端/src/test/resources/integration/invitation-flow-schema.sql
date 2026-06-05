create table app_user (
  id varchar(64) primary key,
  account varchar(64) not null,
  password_hash varchar(128) not null,
  name_enc varchar(255),
  phone_enc varchar(255),
  role varchar(32) not null,
  status varchar(32) not null,
  created_at timestamp default current_timestamp
);

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
  allergy_enc varchar(255),
  status varchar(32) not null
);

create table invitation (
  id varchar(64) primary key,
  code varchar(64) not null,
  elder_id varchar(64) not null,
  expires_at varchar(32),
  max_uses int not null,
  used_count int not null,
  status varchar(32) not null,
  created_at varchar(32)
);

create table family_binding (
  id varchar(64) primary key,
  family_user_id varchar(64) not null,
  family_name_enc varchar(255),
  family_phone_enc varchar(255),
  relationship varchar(64),
  elder_id varchar(64) not null,
  invitation_code varchar(64),
  bound_at varchar(32),
  status varchar(32) not null
);

create table sms_code (
  id varchar(64) primary key,
  phone_hash varchar(255),
  code_hash varchar(255),
  scene varchar(64),
  expires_at timestamp,
  created_at timestamp default current_timestamp,
  attempts int default 0,
  verified int default 0
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

create table sms_relay_device (
  id bigint auto_increment primary key,
  device_id varchar(64) not null,
  receiver_phone varchar(32),
  server_url varchar(255),
  message_prefix varchar(32),
  device_secret varchar(255),
  status varchar(32)
);
