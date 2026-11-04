UPDATE `cat` SET `actions`=(SELECT count(*) FROM `actions`);
