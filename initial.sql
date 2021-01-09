create database hotel
default character set utf8 
default collate utf8_general_ci;

create user 'hotel'@'localhost';

alter user 'hotel'@'localhost'
identified with mysql_native_password by '$money$is!not!everything';

create table hotel.guest(
    guestId int unsigned auto_increment,
    guestName varchar(25),
    /* 0: female, 1: male */
    guestSex tinyint unsigned, check (guestSex in (0, 1)),
    guestAge tinyint unsigned,
    primary key (guestId)
);

create table hotel.team(
    teamId int unsigned auto_increment,
    guestId int unsigned,
    teamName varchar(25),
    teamSize smallint unsigned,
    primary key (teamId, guestId),
    foreign key (guestId) references guest(guestId)
);

create table hotel.room(
    roomId varchar(10),
    roomPrice numeric(19, 2),
    roomType varchar(25),
    primary key (roomId)
);

create table hotel.order(
    orderId int unsigned auto_increment,
    guestId int unsigned,
    teamId int unsigned,
    roomId varchar(10),
    startDate date,
    endDate date,
    /* 0: normal, 1: canceled, 2: payed */
    orderStatus tinyint unsigned, check (orderStatus in (0, 1, 2)),
    primary key (orderId),
    foreign key (guestId) references guest(guestId),
    foreign key (teamId) references team(teamId),
    foreign key (roomId) references room(roomId)
);

grant all privileges on hotel.* to 'hotel'@'localhost';
