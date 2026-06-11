CREATE DATABASE IF NOT EXISTS taekwondo_assessment
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE taekwondo_assessment;

DROP TABLE IF EXISTS competition_points;
DROP TABLE IF EXISTS certificates;
DROP TABLE IF EXISTS exam_scores;
DROP TABLE IF EXISTS exam_registrations;
DROP TABLE IF EXISTS exams;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS coaches;
DROP TABLE IF EXISTS rank_rules;

CREATE TABLE coaches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  phone VARCHAR(20),
  rank VARCHAR(20) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE rank_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  current_rank VARCHAR(20) NOT NULL,
  target_rank VARCHAR(20) NOT NULL,
  required_hours INT NOT NULL DEFAULT 0,
  rank_order INT NOT NULL,
  UNIQUE KEY uk_rank_transition (current_rank, target_rank)
) ENGINE=InnoDB;

CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  gender ENUM('male','female') NOT NULL,
  birth_date DATE,
  phone VARCHAR(20),
  current_rank VARCHAR(20) NOT NULL DEFAULT '白带',
  enrollment_date DATE NOT NULL,
  total_hours INT NOT NULL DEFAULT 0,
  coach_id INT,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_coach (coach_id),
  KEY idx_rank (current_rank),
  CONSTRAINT fk_student_coach FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE exams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  exam_date DATE NOT NULL,
  status ENUM('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE exam_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exam_id INT NOT NULL,
  student_id INT NOT NULL,
  target_rank VARCHAR(20) NOT NULL,
  group_name VARCHAR(50),
  passed TINYINT(1) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_exam_student (exam_id, student_id),
  KEY idx_exam (exam_id),
  KEY idx_student (student_id),
  CONSTRAINT fk_reg_exam FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  CONSTRAINT fk_reg_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE exam_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  registration_id INT NOT NULL,
  judge_name VARCHAR(50) NOT NULL,
  basic_movements DECIMAL(5,2) NOT NULL DEFAULT 0,
  poomsae DECIMAL(5,2) NOT NULL DEFAULT 0,
  sparring DECIMAL(5,2) NOT NULL DEFAULT 0,
  breaking DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_registration (registration_id),
  CONSTRAINT fk_score_registration FOREIGN KEY (registration_id) REFERENCES exam_registrations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  registration_id INT NOT NULL,
  certificate_no VARCHAR(50) NOT NULL UNIQUE,
  rank VARCHAR(20) NOT NULL,
  student_name VARCHAR(50) NOT NULL,
  issue_date DATE NOT NULL,
  qr_code TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_registration (registration_id),
  KEY idx_cert_no (certificate_no),
  CONSTRAINT fk_cert_registration FOREIGN KEY (registration_id) REFERENCES exam_registrations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE competition_points (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  competition_name VARCHAR(100) NOT NULL,
  competition_level ENUM('national','provincial','municipal') NOT NULL,
  competition_date DATE NOT NULL,
  placement INT NOT NULL,
  points INT NOT NULL DEFAULT 0,
  year INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_student (student_id),
  KEY idx_year (year),
  CONSTRAINT fk_comp_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO rank_rules (current_rank, target_rank, required_hours, rank_order) VALUES
('白带', '黄带', 30, 1),
('黄带', '绿带', 40, 2),
('绿带', '蓝带', 50, 3),
('蓝带', '红带', 60, 4),
('红带', '黑带1段', 80, 5),
('黑带1段', '黑带2段', 120, 6),
('黑带2段', '黑带3段', 150, 7),
('黑带3段', '黑带4段', 180, 8),
('黑带4段', '黑带5段', 240, 9),
('黑带5段', '黑带6段', 300, 10),
('黑带6段', '黑带7段', 360, 11),
('黑带7段', '黑带8段', 420, 12),
('黑带8段', '黑带9段', 480, 13);

INSERT INTO coaches (name, phone, rank) VALUES
('李教练', '13800001111', '黑带5段'),
('王教练', '13800002222', '黑带4段'),
('张教练', '13800003333', '黑带3段');

INSERT INTO students (name, gender, birth_date, phone, current_rank, enrollment_date, total_hours, coach_id) VALUES
('陈小明', 'male', '2010-03-15', '13900001111', '白带', '2025-09-01', 35, 1),
('刘思思', 'female', '2011-07-22', '13900002222', '白带', '2025-10-15', 28, 1),
('赵大力', 'male', '2009-11-08', '13900003333', '黄带', '2025-06-01', 65, 2),
('孙小美', 'female', '2012-01-30', '13900004444', '绿带', '2025-03-01', 90, 2),
('周强', 'male', '2008-05-12', '13900005555', '蓝带', '2024-09-01', 160, 3),
('吴佳琪', 'female', '2010-09-18', '13900006666', '红带', '2024-03-01', 200, 3);
